import { Pool } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false, ca: fs.readFileSync(process.env.DB_SSL_ROOT_CERT || 'global-bundle.pem').toString() }
});

async function main() {
    const client = await pool.connect();
    try {
        const result = await client.query(`
            SELECT
                r.id, r.name, r.current_stock, r.unit,
                COALESCE(SUM(ABS(t.quantity)) FILTER (WHERE t.transaction_type IN ('production_usage', 'production', 'consumption')), 0) as used_quantity,
                MAX(t.created_at) as last_used
            FROM resources r
            LEFT JOIN resource_stock_transactions t ON r.id = t.resource_id
            GROUP BY r.id, r.name, r.current_stock, r.unit
            ORDER BY used_quantity DESC
        `);
        console.log('Analytics:', JSON.stringify(result.rows, null, 2));
    } finally {
        client.release();
        process.exit(0);
    }
}
main();
