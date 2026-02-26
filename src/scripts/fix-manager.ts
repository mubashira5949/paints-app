/**
 * Fix Manager Script
 * This script is used to manually update the initial manager user's email and password.
 * This is helpful if the database was migrated or if credentials need to be reset.
 */

import { Pool } from 'pg';
import bcrypt from 'bcrypt';
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
 * Main function to fix/update the manager's credentials.
 */
async function fixManager() {
    try {
        console.log('Fixing manager user...');

        // Define the default password for the initial manager account.
        const password = 'managerpassword';

        // Securely hash the password using bcrypt.
        const hashedPassword = await bcrypt.hash(password, 10);

        /**
         * Update the manager user in the database.
         * We update both the email (to 'manager@paintsapp.com') and the password hash.
         * The user is identified by the permanent username 'initial_manager'.
         */
        const result = await pool.query(
            "UPDATE users SET email = 'manager@paintsapp.com', password_hash = $1 WHERE username = 'initial_manager' RETURNING email",
            [hashedPassword]
        );

        if (result.rows.length === 0) {
            console.log('User "initial_manager" not found.');
        } else {
            console.log('Manager fixed successfully with email:', result.rows[0].email);
        }
        process.exit(0);
    } catch (err) {
        // Log any database or runtime errors and exit with failure code.
        console.error('Error fixing manager:', err);
        process.exit(1);
    }
}

// Execute the fix function.
fixManager();
