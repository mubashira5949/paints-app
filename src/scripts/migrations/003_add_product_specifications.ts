import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function runMigration() {
    try {
        console.log('Running migration 003: Add Product Specifications...');

        await pool.query(`
            ALTER TABLE colors 
            ADD COLUMN IF NOT EXISTS hsn_code VARCHAR(50),
            ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;
        `);

        console.log('Migration 003 applied successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Error applying migration 003:', err);
        process.exit(1);
    }
}

runMigration();
