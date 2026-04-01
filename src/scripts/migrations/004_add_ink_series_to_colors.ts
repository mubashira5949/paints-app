/**
 * Database Migration Script: Add Ink Series to Colors
 * This script adds the 'ink_series' column to the 'colors' table.
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
        console.log('Adding "ink_series" to "colors" table...');

        // Add ink_series column
        await pool.query('ALTER TABLE colors ADD COLUMN IF NOT EXISTS ink_series VARCHAR(50)');

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
