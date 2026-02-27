/**
 * User Email Update Script
 * This utility script is used to specifically update the email address 
 * of the 'initial_manager' account in the database.
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
 * Main function to update the user's email.
 */
async function updateEmail() {
    try {
        console.log('Updating user email...');

        /**
         * Execute the update query.
         * Sets a specific email for the user identified by their username.
         */
        const result = await pool.query(
            "UPDATE users SET email = 'manager@paintsapp.com' WHERE username = 'initial_manager' RETURNING email"
        );

        if (result.rows.length === 0) {
            console.log('User "initial_manager" not found.');
        } else {
            console.log('Email updated successfully to:', result.rows[0].email);
        }
        process.exit(0);
    } catch (err) {
        // Log query errors and exit with failure code.
        console.error('Error updating email:', err);
        process.exit(1);
    }
}

// Execute the update function.
updateEmail();
