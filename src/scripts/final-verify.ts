
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function verify() {
    try {
        const res = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'production_runs' AND column_name = 'loss_reason';
        `);
        if (res.rows.length > 0) {
            console.log('VERIFIED: loss_reason column exists.');
        } else {
            console.error('FAILED: loss_reason column STILL missing.');
        }
    } catch (err: any) {
        console.error('Error during verification:', err.message);
    } finally {
        await pool.end();
    }
}

verify();
