/**
 * Database Migration Script: 011 Create Suppliers and Update Resources
 * Adds a 'suppliers' table and links 'resources' to them.
 * Includes 'color' and 'feel' attributes for raw materials.
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    console.log('Running migration 011: Create suppliers table and update resources...');
    
    const query = `
        -- 1. Suppliers management
        CREATE TABLE IF NOT EXISTS suppliers (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) UNIQUE NOT NULL,
            contact_person VARCHAR(255),
            email VARCHAR(255),
            phone VARCHAR(50),
            address TEXT,
            website VARCHAR(255),
            notes TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        -- 2. Update resources with supplier link and attributes
        ALTER TABLE resources ADD COLUMN IF NOT EXISTS supplier_id INTEGER REFERENCES suppliers(id);
        ALTER TABLE resources ADD COLUMN IF NOT EXISTS color VARCHAR(100);
        ALTER TABLE resources ADD COLUMN IF NOT EXISTS feel VARCHAR(100);
        
        -- 3. Add index for supplier search
        CREATE INDEX IF NOT EXISTS idx_resources_supplier_id ON resources(supplier_id);
    `;

    try {
        await pool.query(query);
        console.log('Migration 011 complete: Created suppliers table and updated resources.');
        process.exit(0);
    } catch (err) {
        console.error('Error in migration 011:', err);
        process.exit(1);
    }
}

migrate();
