/**
 * Verification Script: Seed Resource Alerts
 * This script updates resources to be below their reorder level.
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URKG,
    ssl: { rejectUnauthorized: false }
});

async function seed() {
    try {
        console.log('Updating resources for alerts verification...');

        // Update Binder to be low stock
        await pool.query(`
            UPDATE resources 
            SET current_stock = 10.0, reorder_level = 50.0 
            WHERE name ILIKE '%Binder%' OR name ILIKE '%Resin%';
        `);

        // Update Solvent to be low stock
        await pool.query(`
            UPDATE resources 
            SET current_stock = 5.0, reorder_level = 20.0 
            WHERE name ILIKE '%Solvent%' OR name ILIKE '%Water%';
        `);

        console.log('Resource alerts seeded successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Seeding failed:', err);
        process.exit(1);
    }
}

seed();
