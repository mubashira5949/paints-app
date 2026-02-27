/**
 * Schema Verification Script
 * This utility script inspects the PostgreSQL internal schema to list all columns 
 * in the 'users' table. Used to verify that table alterations (migrations) were successful.
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
 * Main function to check the table schema.
 */
async function checkSchema() {
    try {
        console.log('Checking "users" table columns...');

        /**
         * Query the information_schema to get the column names and data types.
         * This is a database-agnostic way to inspect table structures in SQL.
         */
        const result = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'users'
            ORDER BY ordinal_position;
        `);

        if (result.rows.length === 0) {
            console.log('Table "users" does not exist.');
        } else {
            // Output the columns as a table in the console.
            console.table(result.rows);
        }
        process.exit(0);
    } catch (err) {
        // Log errors and exit with failure code.
        console.error('Error checking schema:', err);
        process.exit(1);
    }
}

// Execute the schema check.
checkSchema();
