/**
 * Database Migration Script: 014 Support Multiple POCs for Suppliers
 * Updates the suppliers table to store multiple points of contact as JSONB.
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    console.log('Running migration 014: Adding pocs field to suppliers...');
    
    // We will migrate existing contact_person, email, phone into the new pocs array
    const query = `
        ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS pocs JSONB DEFAULT '[]';
        
        -- Migrate existing data if any
        UPDATE suppliers 
        SET pocs = jsonb_build_array(
            jsonb_build_object(
                'name', contact_person,
                'email', email,
                'phone', phone,
                'role', 'Primary'
            )
        )
        WHERE contact_person IS NOT NULL OR email IS NOT NULL OR phone IS NOT NULL;
    `;

    try {
        await pool.query(query);
        console.log('Migration 014 complete: Added pocs support.');
        process.exit(0);
    } catch (err) {
        console.error('Error in migration 014:', err);
        process.exit(1);
    }
}

migrate();
