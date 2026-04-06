/**
 * Database Migration Script: 012 Update Suppliers with GST and Search Fields
 * Adds 'gst_number' and 'regulatory_info' to the suppliers table.
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    console.log('Running migration 012: Updating suppliers table...');
    
    const query = `
        ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS gst_number VARCHAR(20) UNIQUE;
        ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS regulatory_info TEXT;
    `;

    try {
        await pool.query(query);
        console.log('Migration 012 complete: Updated suppliers table.');
        process.exit(0);
    } catch (err) {
        console.error('Error in migration 012:', err);
        process.exit(1);
    }
}

migrate();
