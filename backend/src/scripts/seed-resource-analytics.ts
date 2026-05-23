import { Pool } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false, ca: fs.readFileSync(process.env.DB_SSL_ROOT_CERT || 'global-bundle.pem').toString() }
});

async function seedResourceTransactions() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const userRes = await client.query('SELECT id FROM users LIMIT 1');
        const userId = userRes.rows[0].id;

        const runsRes = await client.query(`SELECT id FROM production_runs WHERE status = 'completed' LIMIT 2`);
        const resources = await client.query('SELECT id, name FROM resources LIMIT 10');

        if (resources.rows.length === 0) throw new Error('No resources found.');

        // Usage quantities per resource — kept within seeded current_stock to avoid constraint violations
        const usageMap: Record<string, number> = {
            'Titanium Dioxide': 80,
            'Carbon Black': 30,       // stock is 50
            'Acrylic Resin': 500,
            'Polyurethane Dispersion': 80,  // stock is 150
            'Toluene': 300,
            'Xylene': 0,              // stagnant (stock < reorder)
            'Phthalocyanine Blue': 100,
            'Calcium Carbonate': 800,
            'Defoamer PD-20': 0,      // stagnant
            'Anti-settling Agent': 0, // stagnant
        };

        const runId = runsRes.rows.length > 0 ? runsRes.rows[0].id : null;

        console.log('Inserting resource stock transactions...');
        for (const r of resources.rows) {
            const qty = usageMap[r.name];
            if (!qty) continue; // Skip stagnant - leave as 0 to show in stagnant list

            // Create transaction spread across multiple days for realistic history
            const daysAgo = Math.floor(Math.random() * 7) + 1;
            const date = new Date();
            date.setDate(date.getDate() - daysAgo);

            await client.query(`
                INSERT INTO resource_stock_transactions (resource_id, transaction_type, quantity, reference_id, notes, created_at)
                VALUES ($1, 'production_usage', $2, $3, 'Production consumption', $4)
            `, [r.id, -qty, runId, date]);
        }

        await client.query('COMMIT');
        console.log('Successfully seeded resource stock transactions!');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error:', err);
    } finally {
        client.release();
        process.exit(0);
    }
}

seedResourceTransactions();
