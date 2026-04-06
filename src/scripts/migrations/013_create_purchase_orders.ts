/**
 * Database Migration Script: 013 Create Purchase Orders and Items Table
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    console.log('Running migration 013: Creating purchase_orders and purchase_order_items tables...');
    
    const query = `
        CREATE TABLE IF NOT EXISTS purchase_orders (
            id SERIAL PRIMARY KEY,
            supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
            status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'ordered', 'received', 'partially_received', 'cancelled')),
            notes TEXT,
            share_token UUID DEFAULT gen_random_uuid(),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS purchase_order_items (
            id SERIAL PRIMARY KEY,
            purchase_order_id INTEGER REFERENCES purchase_orders(id) ON DELETE CASCADE,
            resource_id INTEGER REFERENCES resources(id) ON DELETE SET NULL,
            quantity DECIMAL(12, 4) NOT NULL,
            unit VARCHAR(20) NOT NULL,
            unit_price DECIMAL(12, 2) DEFAULT 0,
            received_quantity DECIMAL(12, 4) DEFAULT 0,
            refunded_quantity DECIMAL(12, 4) DEFAULT 0,
            refund_status VARCHAR(50) DEFAULT 'none' CHECK (refund_status IN ('none', 'pending', 'completed', 'rejected')),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_po_supplier_id ON purchase_orders(supplier_id);
        CREATE INDEX IF NOT EXISTS idx_poi_po_id ON purchase_order_items(purchase_order_id);
    `;

    try {
        await pool.query(query);
        console.log('Migration 013 complete: Created purchase order tables.');
        process.exit(0);
    } catch (err) {
        console.error('Error in migration 013:', err);
        process.exit(1);
    }
}

migrate();
