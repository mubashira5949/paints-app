
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// We need a valid token to call the API.
// Since I don't have one easily, I'll try to check the DB directly first.
// If the DB has the column, then the error might be something else.

import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkDb() {
    try {
        const res = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'production_runs' AND column_name = 'loss_reason';
        `);
        console.log('Column check results:', res.rows);
        if (res.rows.length === 0) {
            console.error('CRITICAL: loss_reason column is missing!');
        }
    } catch (err) {
        console.error('Failed to check DB:', err);
    } finally {
        await pool.end();
    }
}

checkDb();
