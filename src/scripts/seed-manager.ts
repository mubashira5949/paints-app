/**
 * Seeding Script: Initial Manager
 * Creates a default manager user if one doesn't exist.
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
    ssl: {
        rejectUnauthorized: false
    }
});

/**
 * Main function to seed the initial manager user.
 */
async function seed() {
    try {
        console.log('Seeding initial manager user...');

        // 1. Retrieve the ID for the 'manager' role from the roles table.
        const roleResult = await pool.query('SELECT id FROM roles WHERE name = $1', ['manager']);
        if (roleResult.rows.length === 0) {
            console.error('Manager role not found. Please run setup-db or seed-roles first.');
            process.exit(1);
        }
        const roleId = roleResult.rows[0].id;

        // 2. Hash the default password for the manager user.
        const password = 'managerpassword';
        const hashedPassword = await bcrypt.hash(password, 10);

        // 3. Insert the initial manager user into the users table.
        // Uses ON CONFLICT to prevent error if the user already exists.
        await pool.query(
            'INSERT INTO users (username, password_hash, role_id) VALUES ($1, $2, $3) ON CONFLICT (username) DO NOTHING',
            ['initial_manager', hashedPassword, roleId]
        );

        console.log('Initial manager user created!');
        console.log('Username: initial_manager');
        console.log('Password: managerpassword');
        process.exit(0);
    } catch (err) {
        // Log errors and exit with failure code.
        console.error('Error seeding manager:', err);
        process.exit(1);
    }
}

// Execute the seeding function.
seed();
