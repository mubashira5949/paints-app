/**
 * Database Migration Script: 010 Create Product Losses
 * Adds a 'product_losses' table to track documented product losses by personnel.
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    console.log('Running migration 010: Create product_losses table...');
    
    const query = `
        -- Item type for loss tracking
        CREATE TYPE loss_item_type AS ENUM ('finished_good', 'raw_material');

        -- Category of loss
        CREATE TABLE IF NOT EXISTS loss_reasons (
            id SERIAL PRIMARY KEY,
            name VARCHAR(50) UNIQUE NOT NULL,
            description TEXT
        );

        INSERT INTO loss_reasons (name, description) VALUES 
        ('Damaged', 'Product physically damaged in warehouse or transit'),
        ('Expired', 'Product exceeded shelf life'),
        ('Spillage', 'Accidental release or spillage'),
        ('QC Failure', 'Quality control check failed'),
        ('Shipping Loss', 'Lost during delivery to customer'),
        ('Customer Return', 'Returned by customer in unsellable condition'),
        ('Other', 'Miscellaneous documentation')
        ON CONFLICT (name) DO NOTHING;

        -- Main losses table
        CREATE TABLE IF NOT EXISTS product_losses (
            id SERIAL PRIMARY KEY,
            item_type loss_item_type NOT NULL,
            color_id INTEGER REFERENCES colors(id), -- NULL if raw_material
            resource_id INTEGER REFERENCES resources(id), -- NULL if finished_good
            pack_size_kg DECIMAL(12, 4), -- NULL if raw_material
            quantity_units INTEGER, -- NULL if raw_material
            quantity_kg DECIMAL(12, 4) NOT NULL,
            reason_id INTEGER REFERENCES loss_reasons(id) NOT NULL,
            notes TEXT,
            documented_by INTEGER REFERENCES users(id) NOT NULL,
            documented_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            reference_type VARCHAR(50), -- 'production_run', 'order', 'return'
            reference_id INTEGER, -- Dynamic reference
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        -- Add indexes for performance
        CREATE INDEX idx_product_losses_color_id ON product_losses(color_id);
        CREATE INDEX idx_product_losses_resource_id ON product_losses(resource_id);
    `;

    try {
        await pool.query(query);
        console.log('Migration 010 complete: Created product_losses table.');
        process.exit(0);
    } catch (err) {
        console.error('Error in migration 010:', err);
        process.exit(1);
    }
}

migrate();
