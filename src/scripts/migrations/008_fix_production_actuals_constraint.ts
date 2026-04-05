/**
 * Database Migration Script: 008 Fix Production Actuals Constraint
 * Adds a UNIQUE constraint to production_resource_actuals(production_run_id, resource_id)
 * to support ON CONFLICT update logic in the production module's PATCH endpoint.
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { 
        rejectUnauthorized: false
    }
});

async function migrate() {
    try {
        console.log('Adding UNIQUE constraint to "production_resource_actuals"...');

        // First, handle any existing duplicates if they exist (keep the latest one)
        await pool.query(`
            DELETE FROM production_resource_actuals a
            USING production_resource_actuals b
            WHERE a.id < b.id
              AND a.production_run_id = b.production_run_id
              AND a.resource_id = b.resource_id;
        `);

        // Add the unique constraint
        await pool.query(`
            ALTER TABLE production_resource_actuals 
            ADD CONSTRAINT unique_production_run_resource 
            UNIQUE (production_run_id, resource_id);
        `);

        console.log('Migration 008 complete: UNIQUE constraint added to production_resource_actuals.');
        process.exit(0);
    } catch (err) {
        // If the constraint already exists, just log and exit gracefully
        if ((err as any).code === '42P16') {
            console.log('Migration 008: Constraint already exists, skipping.');
            process.exit(0);
        }
        console.error('Migration 008 failed:', err);
        process.exit(1);
    }
}

migrate();
