const { Pool } = require("pg");
const pool = new Pool({ connectionString: "postgresql://neondb_owner:npg_8nWuhVFow0eS@ep-odd-frost-a1s700hi-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=verify-full&ssl=true" });

async function run() {
  try {
    const r1 = await pool.query(`SELECT COALESCE(SUM(pr.actual_quantity_kg), 0) AS total
                     FROM production_runs pr
                     JOIN formulas r ON pr.formula_id = r.id
                     JOIN colors c ON r.color_id = c.id
                     WHERE 1=1 AND pr.status = 'completed'`);
    console.log("R1:", r1.rows);
  } catch(e) { console.error("ERR1", e); }
  
  try {
    const r2 = await pool.query(`SELECT COALESCE(SUM(pra.actual_quantity_used), 0) AS total
                     FROM production_resource_actuals pra
                     JOIN production_runs pr ON pra.production_run_id = pr.id
                     JOIN formulas r ON pr.formula_id = r.id
                     JOIN colors c ON r.color_id = c.id
                     WHERE 1=1`);
    console.log("R2:", r2.rows);
  } catch(e) { console.error("ERR2", e); }
  pool.end();
}
run();
