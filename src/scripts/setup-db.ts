
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

const schema = `
-- 1. Roles
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Users
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role_id INTEGER REFERENCES roles(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Resources (Raw Materials)
CREATE TABLE IF NOT EXISTS resources (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    unit VARCHAR(20) NOT NULL, -- e.g., kg, L, units
    current_stock DECIMAL(12, 4) DEFAULT 0,
    reorder_level DECIMAL(12, 4) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Colors (Finished Goods Products)
CREATE TABLE IF NOT EXISTS colors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    color_code VARCHAR(50), -- e.g., HEX, RAL code
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Recipes
CREATE TABLE IF NOT EXISTS recipes (
    id SERIAL PRIMARY KEY,
    color_id INTEGER REFERENCES colors(id) NOT NULL,
    name VARCHAR(255) NOT NULL,
    version VARCHAR(20) DEFAULT '1.0.0',
    batch_size_liters DECIMAL(12, 4) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Recipe Resources (Bill of Materials)
CREATE TABLE IF NOT EXISTS recipe_resources (
    id SERIAL PRIMARY KEY,
    recipe_id INTEGER REFERENCES recipes(id) ON DELETE CASCADE NOT NULL,
    resource_id INTEGER REFERENCES resources(id) NOT NULL,
    quantity_required DECIMAL(12, 4) NOT NULL,
    UNIQUE(recipe_id, resource_id)
);

-- 7. Production Runs
CREATE TABLE IF NOT EXISTS production_runs (
    id SERIAL PRIMARY KEY,
    recipe_id INTEGER REFERENCES recipes(id) NOT NULL,
    status VARCHAR(50) DEFAULT 'planned', -- planned, in_progress, completed, cancelled
    planned_quantity_liters DECIMAL(12, 4) NOT NULL,
    actual_quantity_liters DECIMAL(12, 4),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Production Resource Actuals (Variance tracking)
CREATE TABLE IF NOT EXISTS production_resource_actuals (
    id SERIAL PRIMARY KEY,
    production_run_id INTEGER REFERENCES production_runs(id) ON DELETE CASCADE NOT NULL,
    resource_id INTEGER REFERENCES resources(id) NOT NULL,
    actual_quantity_used DECIMAL(12, 4) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Resource Stock Transactions
CREATE TABLE IF NOT EXISTS resource_stock_transactions (
    id SERIAL PRIMARY KEY,
    resource_id INTEGER REFERENCES resources(id) NOT NULL,
    transaction_type VARCHAR(50) NOT NULL, -- purchase, production_usage, adjustment, return
    quantity DECIMAL(12, 4) NOT NULL, -- positive for add, negative for remove
    reference_id INT, -- e.g., production_run_id
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Finished Stock (Current levels for colors)
CREATE TABLE IF NOT EXISTS finished_stock (
    id SERIAL PRIMARY KEY,
    color_id INTEGER REFERENCES colors(id) UNIQUE NOT NULL,
    quantity_liters DECIMAL(12, 4) DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. Finished Stock Transactions
CREATE TABLE IF NOT EXISTS finished_stock_transactions (
    id SERIAL PRIMARY KEY,
    color_id INTEGER REFERENCES colors(id) NOT NULL,
    transaction_type VARCHAR(50) NOT NULL, -- production_entry, sale, adjustment, return
    quantity_liters DECIMAL(12, 4) NOT NULL,
    reference_id INT, -- e.g., production_run_id or sale_id
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Initial Roles
INSERT INTO roles (name, description) VALUES 
('admin', 'Super Administrator with full access'),
('manager', 'Production and Inventory Manager'),
('staff', 'Standard floor staff for recording production')
ON CONFLICT (name) DO NOTHING;
`;

async function setup() {
    try {
        console.log('Starting database schema creation...');
        await pool.query(schema);
        console.log('Database schema created successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Error creating database schema:', err);
        process.exit(1);
    }
}

setup();
