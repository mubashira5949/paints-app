import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const migrate = `
ALTER TABLE finished_stock_transactions ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id);

CREATE TABLE IF NOT EXISTS client_orders (
    id SERIAL PRIMARY KEY,
    client_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    notes TEXT,
    created_by INTEGER REFERENCES users(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS client_order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES client_orders(id) ON DELETE CASCADE,
    color_id INTEGER REFERENCES colors(id) NOT NULL,
    pack_size_kg DECIMAL(5, 2) NOT NULL,
    quantity INTEGER NOT NULL
);
`;

async function run() {
    try {
        await pool.query(migrate);
        console.log('Migration successful');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
run();
