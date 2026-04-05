/**
 * Database Migration Script: 009 Add Loss Reason to Production
 * Adds a 'loss_reason' column to the 'production_runs' table to support yield loss documentation.
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { 
        rejectUnauthorized: false
    }
});

async function migrate() {
    try {
        console.log('Adding column "loss_reason" to "production_runs"...');

        await pool.query(`
            ALTER TABLE production_runs 
            ADD COLUMN IF NOT EXISTS loss_reason TEXT;
        `);

        console.log('Migration 009 complete: Column "loss_reason" added to "production_runs".');
        process.exit(0);
    } catch (err) {
        console.error('Migration 009 failed:', err);
        process.exit(1);
    }
}

migrate();
