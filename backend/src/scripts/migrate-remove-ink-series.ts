/**
 * Database Migration Script: Remove ink_series column from colors table
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    try {
        console.log('Removing "ink_series" column from "colors" table...');
        await pool.query('ALTER TABLE colors DROP COLUMN IF EXISTS ink_series');
        console.log('Database migrated successfully: "ink_series" column removed.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
