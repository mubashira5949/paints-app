/**
 * Database Migration Script: Add Fulfillment Tracking 
 * Modifies client_orders table to support segmented tracking (shipping, payment, returns, refunds)
 * Initializes order_returns and order_return_items tables for detailed auditing.
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { 
        rejectUnauthorized: false,
        servername: 'db.neon.tech'
    }
});

async function migrate() {
    try {
        console.log('Adding fulfillment columns to "client_orders" and creating return tables...');

        await pool.query(`
            -- 1. Expand client_orders Table Context
            ALTER TABLE client_orders 
              ADD COLUMN IF NOT EXISTS shipping_status VARCHAR(50) DEFAULT 'pending',
              ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50), 
              ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'pending',
              ADD COLUMN IF NOT EXISTS return_status VARCHAR(50),  
              ADD COLUMN IF NOT EXISTS refund_status VARCHAR(50);

            -- 2. New order_returns Table (Audit & Granular Tracking)
            CREATE TABLE IF NOT EXISTS order_returns (
                id SERIAL PRIMARY KEY,
                order_id INTEGER REFERENCES client_orders(id) ON DELETE CASCADE,
                status VARCHAR(50) DEFAULT 'initiated',
                notes TEXT,
                created_by INTEGER REFERENCES users(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                resolved_at TIMESTAMP WITH TIME ZONE
            );

            -- 3. New order_return_items Table
            CREATE TABLE IF NOT EXISTS order_return_items (
                id SERIAL PRIMARY KEY,
                return_id INTEGER REFERENCES order_returns(id) ON DELETE CASCADE,
                order_item_id INTEGER REFERENCES client_order_items(id) ON DELETE CASCADE,
                quantity INTEGER NOT NULL,
                qc_status VARCHAR(50) DEFAULT 'pending_inspection' -- pending_inspection, passed, failed
            );
        `);

        console.log('Migration 007 complete: Fulfillment tables and columns added.');
        process.exit(0);
    } catch (err) {
        console.error('Migration 007 failed:', err);
        process.exit(1);
    }
}

migrate();
