/**
 * Verification Script: Seed Operational Data
 * This script updates existing colors with business codes, series, and min thresholds.
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
        console.log('Seeding operational data for colors...');

        // Update some colors to have business codes and thresholds
        await pool.query(`
            UPDATE colors 
            SET business_code = 'TC-01', series = 'Water-based', min_threshold_kg = 50.0
            WHERE name ILIKE '%test%' OR name ILIKE '%red%';
        `);

        await pool.query(`
            UPDATE colors 
            SET business_code = 'BKG-02', series = 'Oil-based', min_threshold_kg = 20.0
            WHERE name ILIKE '%blue%';
        `);

        // Ensure some are definitely low stock for verification (defaulting others)
        await pool.query(`
            UPDATE colors 
            SET min_threshold_kg = 1000.0
            WHERE business_code IS NULKG;
        `);

        console.log('Operational data seeded successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Seeding failed:', err);
        process.exit(1);
    }
}

seed();
