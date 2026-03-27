/**
 * Database Migration Script: Improve Colors Table
 * This script adds 'business_code', 'series', and 'min_threshold_kg' columns to the 'colors' table.
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load environment variables for database connection.
dotenv.config();

/**
 * Configure PostgreSQL connection pool.
 */
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

/**
 * Main migration logic.
 */
async function migrate() {
    try {
        console.log('Improving "colors" table schema...');

        // Add business_code column
        await pool.query('ALTER TABLE colors ADD COLUMN IF NOT EXISTS business_code VARCHAR(50)');

        // Add series column
        await pool.query('ALTER TABLE colors ADD COLUMN IF NOT EXISTS series VARCHAR(100)');

        // Add min_threshold_kg column
        await pool.query('ALTER TABLE colors ADD COLUMN IF NOT EXISTS min_threshold_kg DECIMAL(12, 4) DEFAULT 0');

        console.log('Database migrated successfully: "colors" table updated.');
        process.exit(0);
    } catch (err) {
        // Log migration errors and exit with failure code.
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

// Execute the migration.
migrate();
