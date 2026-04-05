const { Client } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function check() {
  try {
    await client.connect();
    const res = await client.query(`
        SELECT pr.id, pr.status, pr.actual_quantity_kg, pr.planned_quantity_kg,
               (SELECT COALESCE(SUM(quantity_kg), 0) FROM finished_stock_transactions WHERE reference_id = pr.id AND transaction_type = 'production_entry') as packaged_vol
        FROM production_runs pr
        WHERE pr.status IN ('planned', 'running', 'paused', 'completed', 'packaging')
        AND (
            pr.status IN ('planned', 'running', 'paused')
            OR (
                pr.status IN ('completed', 'packaging')
                AND (SELECT COALESCE(SUM(quantity_kg), 0) FROM finished_stock_transactions WHERE reference_id = pr.id AND transaction_type = 'production_entry') < (COALESCE(pr.actual_quantity_kg, pr.planned_quantity_kg) - 0.1)
            )
        )
    `);
    console.log("Active runs returned by new logic:");
    res.rows.forEach(r => {
        console.log(\`ID: \${r.id}, Status: \${r.status}, Yield: \${r.actual_quantity_kg ?? r.planned_quantity_kg}, Packaged: \${r.packaged_vol}\`);
    });
    
    // Also check for hidden runs that would be hidden by this logic
    const hidden = await client.query(\`
        SELECT pr.id, pr.status, pr.actual_quantity_kg, pr.planned_quantity_kg,
               (SELECT COALESCE(SUM(quantity_kg), 0) FROM finished_stock_transactions WHERE reference_id = pr.id AND transaction_type = 'production_entry') as packaged_vol
        FROM production_runs pr
        WHERE pr.status IN ('completed', 'packaging')
        AND (SELECT COALESCE(SUM(quantity_kg), 0) FROM finished_stock_transactions WHERE reference_id = pr.id AND transaction_type = 'production_entry') >= (COALESCE(pr.actual_quantity_kg, pr.planned_quantity_kg) - 0.1)
    \`);
    console.log("\nRuns hidden by new logic:");
    hidden.rows.forEach(r => {
        console.log(\`ID: \${r.id}, Status: \${r.status}, Yield: \${r.actual_quantity_kg ?? r.planned_quantity_kg}, Packaged: \${r.packaged_vol}\`);
    });

    process.exit(0);
  } catch (err) {
    console.error("Failed to check:", err);
    process.exit(1);
  }
}
check();
