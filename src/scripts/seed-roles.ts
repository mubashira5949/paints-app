/**
 * Seeding Script: Default Roles
 * Populates the 'roles' table with initial system roles.
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
    ssl: {
        rejectUnauthorized: false
    }
});

/**
 * List of default roles to be created in the system.
 */
const roles = [
    { name: 'manager', description: 'Production and Inventory Manager' },
    { name: 'operator', description: 'Production floor operator' },
    { name: 'sales', description: 'Sales and order management' },
    { name: 'client', description: 'External client access' },
    { name: 'admin', description: 'Super Administrator' }
];

/**
 * Main function to seed the roles.
 */
async function seed() {
    try {
        console.log('Seeding default roles...');

        // Iterate through each role and insert it into the database.
        for (const role of roles) {
            // Use ON CONFLICT to avoid duplicate key errors if roles already exist.
            await pool.query(
                'INSERT INTO roles (name, description) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING',
                [role.name, role.description]
            );
        }

        console.log('Roles seeded successfully!');
        process.exit(0);
    } catch (err) {
        // Log errors and exit with failure code.
        console.error('Error seeding roles:', err);
        process.exit(1);
    }
}

// Execute the seeding function.
seed();
