/**
 * Database Migration Script: Add Series Availability to Colors
 * Adds available_lcs, available_std, available_opq_js boolean columns
 * to distinguish which ink series each color supports.
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { 
        rejectUnauthorized: false,
        servername: 'db.neon.tech'
    }
});

async function migrate() {
    try {
        console.log('Adding series availability columns to "colors" table...');

        await pool.query(`
            ALTER TABLE colors
              ADD COLUMN IF NOT EXISTS available_lcs    BOOLEAN NOT NULL DEFAULT TRUE,
              ADD COLUMN IF NOT EXISTS available_std    BOOLEAN NOT NULL DEFAULT TRUE,
              ADD COLUMN IF NOT EXISTS available_opq_js BOOLEAN NOT NULL DEFAULT TRUE
        `);

        console.log('Migration 006 complete: availability columns added.');
        process.exit(0);
    } catch (err) {
        console.error('Migration 006 failed:', err);
        process.exit(1);
    }
}

migrate();
