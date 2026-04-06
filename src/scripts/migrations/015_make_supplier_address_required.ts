/**
 * Database Migration Script: 015 Make Supplier Address Required
 * Sets 'address' column to NOT NULL for the 'suppliers' table.
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    console.log('Running migration 015: Make supplier address required...');
    
    // First fill in empty addresses for existing records to avoid failure
    const updateQuery = `UPDATE suppliers SET address = 'No recorded address' WHERE address IS NULL OR address = '';`;
    
    const query = `ALTER TABLE suppliers ALTER COLUMN address SET NOT NULL;`;

    try {
        await pool.query(updateQuery);
        await pool.query(query);
        console.log('Migration 015 complete: Supplier address is now NOT NULL.');
        process.exit(0);
    } catch (err) {
        console.error('Error in migration 015:', err);
        process.exit(1);
    }
}

migrate();
