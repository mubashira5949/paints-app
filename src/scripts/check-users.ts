/**
 * User Verification Script
 * This utility script fetches and displays all registered users in the database.
 * It's useful for verifying that migrations and registration endpoints are working.
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
 * Main function to fetch and log users.
 */
async function checkUsers() {
    try {
        console.log('Fetching users from the database...');

        // Execute query to retrieve basic user information (excluding passwords).
        const result = await pool.query(`
            SELECT id, username, email, is_active 
            FROM users;
        `);

        if (result.rows.length === 0) {
            console.log('No users found in the database.');
        } else {
            // Display results in a clean table format in the terminal.
            console.table(result.rows);
        }
        process.exit(0);
    } catch (err) {
        // Log errors and exit with failure code.
        console.error('Error checking users:', err);
        process.exit(1);
    }
}

// Execute the check function.
checkUsers();
