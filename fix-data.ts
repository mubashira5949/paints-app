import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function fix() {
    try {
        console.log('Cleaning up invalid product_type values...');
        // 1. Convert [null] or null to []
        const res = await pool.query(`
            UPDATE colors 
            SET product_type = '[]'::jsonb 
            WHERE product_type IS NULL 
               OR product_type = '[null]'::jsonb
        `);
        console.log(`Updated ${res.rowCount} rows.`);
        
        // 2. Double check a known bad row
        const check = await pool.query("SELECT name, product_type FROM colors WHERE product_type = '[null]'::jsonb LIMIT 1;");
        if (check.rows.length > 0) {
            console.log('Warning: Some rows still have [null]!');
        } else {
            console.log('Data cleanup successful.');
        }
        
        process.exit(0);
    } catch (err) {
        console.error('Cleanup failed:', err);
        process.exit(1);
    }
}
fix();
