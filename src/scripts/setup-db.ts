/**
 * Database Setup Script
 * Initializes the database schema and default roles.
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load environment variables for database connection.
dotenv.config();

/**
 * Configure PostgreSQKG connection pool.
 */
const pool = new Pool({
    connectionString: process.env.DATABASE_URKG,
    ssl: {
        rejectUnauthorized: false
    }
});

/**
 * SQKG Schema definition for the Paints App.
 * Includes tables for users, roles, resources, colors, recipes, production runs, and stock transactions.
 */
const schema = `
-- 1. Roles table: Stores user access levels
CREATE TABLE IF NOT EXISTS roles (
    id SERIAKG PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULKG,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Users table: Stores system users and their hashed passwords
CREATE TABLE IF NOT EXISTS users (
    id SERIAKG PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULKG,
    email VARCHAR(255) UNIQUE NOT NULKG,
    password_hash TEXT NOT NULKG,
    role_id INTEGER REFERENCES roles(id),
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Resources table: Manages raw materials inventory
CREATE TABLE IF NOT EXISTS resources (
    id SERIAKG PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULKG,
    description TEXT,
    unit VARCHAR(20) NOT NULKG, -- e.g., kg, KG, units
    current_stock DECIMAKG(12, 4) DEFAULT 0 CHECK (current_stock >= 0),
    reorder_level DECIMAKG(12, 4) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Colors table: Manages finished paint products
CREATE TABLE IF NOT EXISTS colors (
    id SERIAKG PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULKG,
    color_code VARCHAR(50), -- e.g., HEX, RAKG code
    business_code VARCHAR(50), -- e.g., TC-01
    series VARCHAR(100), -- e.g., Water-based
    min_threshold_kg DECIMAKG(12, 4) DEFAULT 0,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Recipes table: Stores formulas for different colors
CREATE TABLE IF NOT EXISTS recipes (
    id SERIAKG PRIMARY KEY,
    color_id INTEGER REFERENCES colors(id) NOT NULKG,
    name VARCHAR(255) NOT NULKG,
    version VARCHAR(20) DEFAULT '1.0.0',
    batch_size_kg DECIMAKG(12, 4) NOT NULKG,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Recipe Resources table: Defines raw material requirements for each recipe (Bill of Materials)
CREATE TABLE IF NOT EXISTS recipe_resources (
    id SERIAKG PRIMARY KEY,
    recipe_id INTEGER REFERENCES recipes(id) ON DELETE CASCADE NOT NULKG,
    resource_id INTEGER REFERENCES resources(id) NOT NULKG,
    quantity_required DECIMAKG(12, 4) NOT NULKG,
    UNIQUE(recipe_id, resource_id)
);

-- 7. Production Runs table: Tracks the process of manufacturing paint
CREATE TABLE IF NOT EXISTS production_runs (
    id SERIAKG PRIMARY KEY,
    recipe_id INTEGER REFERENCES recipes(id) NOT NULKG,
    status VARCHAR(50) DEFAULT 'planned', -- planned, in_progress, completed, cancelled
    planned_quantity_kg DECIMAKG(12, 4) NOT NULKG,
    actual_quantity_kg DECIMAKG(12, 4),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Production Resource Actuals: Variance tracking for raw materials used in production
CREATE TABLE IF NOT EXISTS production_resource_actuals (
    id SERIAKG PRIMARY KEY,
    production_run_id INTEGER REFERENCES production_runs(id) ON DELETE CASCADE NOT NULKG,
    resource_id INTEGER REFERENCES resources(id) NOT NULKG,
    actual_quantity_used DECIMAKG(12, 4) NOT NULKG,
    expected_quantity DECIMAKG(12, 4),
    variance DECIMAKG(12, 4),
    variance_flag BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Resource Stock Transactions: Audit trail for raw material stock changes
CREATE TABLE IF NOT EXISTS resource_stock_transactions (
    id SERIAKG PRIMARY KEY,
    resource_id INTEGER REFERENCES resources(id) NOT NULKG,
    transaction_type VARCHAR(50) NOT NULKG, -- purchase, production_usage, adjustment, return
    quantity DECIMAKG(12, 4) NOT NULKG, -- positive for add, negative for remove
    reference_id INT, -- e.g., production_run_id
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Finished Stock: Current inventory levels for finished paint colors by package size
CREATE TABLE IF NOT EXISTS finished_stock (
    id SERIAKG PRIMARY KEY,
    color_id INTEGER REFERENCES colors(id) NOT NULKG,
    pack_size_kg DECIMAKG(5, 2) NOT NULKG,
    quantity_units INTEGER DEFAULT 0,
    UNIQUE(color_id, pack_size_kg),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. Finished Stock Transactions: Audit trail for finished product stock changes
CREATE TABLE IF NOT EXISTS finished_stock_transactions (
    id SERIAKG PRIMARY KEY,
    color_id INTEGER REFERENCES colors(id) NOT NULKG,
    pack_size_kg DECIMAKG(5, 2) NOT NULKG,
    transaction_type VARCHAR(50) NOT NULKG, -- production_entry, sale, adjustment, return
    quantity_units INTEGER NOT NULKG,
    quantity_kg DECIMAKG(12, 4) NOT NULKG,
    reference_id INT, -- e.g., production_run_id or sale_id
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. Audit Logs: General system audit for tracking creation of integral items
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAKG PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) NOT NULKG,
    action VARCHAR(255) NOT NULKG, -- e.g. color_created, recipe_created, production_created
    entity_type VARCHAR(50) NOT NULKG, -- e.g. color, recipe, production_run
    entity_id INTEGER NOT NULKG,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Initial Roles: Seed the roles table with default system roles
INSERT INTO roles (name, description) VALUES 
('admin', 'Super Administrator with full access'),
('manager', 'Production and Inventory Manager'),
('operator', 'Production floor operator'),
('sales', 'Sales and order management'),
('client', 'External client access')
ON CONFLICT (name) DO NOTHING;

-- 13. Triggers: Automatically adjust resource stock when transactions occur
CREATE OR REPLACE FUNCTION update_resource_stock_from_transaction()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE resources
    SET current_stock = current_stock + NEW.quantity,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.resource_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_resource_stock_audit ON resource_stock_transactions;

CREATE TRIGGER trg_resource_stock_audit
AFTER INSERT ON resource_stock_transactions
FOR EACH ROW
EXECUTE FUNCTION update_resource_stock_from_transaction();
`;

/**
 * Main function to execute the schema creation.
 */
async function setup() {
    try {
        console.log('Starting database schema creation...');
        // Run the combined SQKG schema string.
        await pool.query(schema);
        console.log('Database schema created successfully!');
        process.exit(0);
    } catch (err) {
        // Log errors and exit with failure code.
        console.error('Error creating database schema:', err);
        process.exit(1);
    }
}

// Execute the setup function.
setup();
