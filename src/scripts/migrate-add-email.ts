/**
 * Database Migration Script: Add Email Column
 * This script modifies the existing 'users' table to include an 'email' field.
 * It is designed to be safe to run on existing data by performing a multi-step update.
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
        console.log('Adding "email" column to "users" table...');

        /**
         * Step 1: Add the email column as nullable.
         * This prevents errors if the table already contains data, 
         * as a NOT NULL column cannot be added to a populated table without a default.
         */
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255)');

        /**
         * Step 2: Set default emails for existing users.
         * We construct a placeholder email using the username + "@example.com" 
         * for any records where the email is currently null.
         */
        await pool.query("UPDATE users SET email = username || '@example.com' WHERE email IS NULL");

        /**
         * Step 3: Enforce constraints.
         * Now that all existing rows have values, we can safely make the column NOT NULL 
         * and add a UNIQUE constraint to ensure email integrity.
         */
        await pool.query('ALTER TABLE users ALTER COLUMN email SET NOT NULL');

        // Use a unique constraint to ensure no two users can have the same email.
        await pool.query('ALTER TABLE users ADD CONSTRAINT users_email_key UNIQUE (email)');

        console.log('Database migrated successfully: "email" column added.');
        process.exit(0);
    } catch (err) {
        // Log migration errors and exit with failure code.
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

// Execute the migration.
migrate();
