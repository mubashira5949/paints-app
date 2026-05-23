/**
 * Production-ready database seed.
 *
 * Idempotent. Bootstraps only what an admin needs to start using the system:
 *   - default roles
 *   - ink grades (LCS, STD, OPQ/JS) and the color_ink_grades junction
 *   - a single admin user (credentials taken from env vars)
 *   - the canonical color catalog (42 colors)
 *
 * No resources, formulas, production runs, finished stock, or sample users.
 * Demo data lives in seed-dashboard.ts / seed-presentation-users.ts.
 *
 * Required env vars:
 *   ADMIN_PASSWORD                 - admin login password
 * Optional env vars:
 *   ADMIN_USERNAME                 - default: admin
 *   ADMIN_EMAIL                    - default: admin@example.com
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

type Grade = 'LCS' | 'STD' | 'OPQ/JS';

const GRADES: Grade[] = ['LCS', 'STD', 'OPQ/JS'];

const ROLES = [
    { name: 'admin', description: 'Super Administrator with full access' },
    { name: 'manager', description: 'Production and Inventory Manager' },
    { name: 'operator', description: 'Production floor operator' },
    { name: 'sales', description: 'Sales and order management' },
    { name: 'client', description: 'External client access' }
];

const COLORS: { name: string; grades: Grade[] }[] = [
    { name: 'BLACK',             grades: ['LCS', 'STD', 'OPQ/JS'] },
    { name: 'LEMON YELLOW',      grades: ['LCS', 'STD', 'OPQ/JS'] },
    { name: 'GOLDEN YELLOW',     grades: ['LCS', 'STD', 'OPQ/JS'] },
    { name: 'BLUE ROYAL',        grades: ['LCS', 'STD', 'OPQ/JS'] },
    { name: 'BLUE NAVY',         grades: ['LCS', 'STD', 'OPQ/JS'] },
    { name: 'ALPHA GREEN',       grades: ['LCS', 'STD', 'OPQ/JS'] },
    { name: 'DALLAS GREEN',      grades: ['LCS', 'STD', 'OPQ/JS'] },
    { name: 'DMP',               grades: ['LCS', 'STD', 'OPQ/JS'] },
    { name: 'ORANGE',            grades: ['LCS', 'STD', 'OPQ/JS'] },
    { name: 'BRITE BLUE',        grades: ['LCS', 'STD', 'OPQ/JS'] },
    { name: 'SPICY BROWN',       grades: ['STD', 'OPQ/JS'] },
    { name: 'VIOLET',            grades: ['STD', 'OPQ/JS'] },
    { name: 'TEE BLUE',          grades: ['STD', 'OPQ/JS'] },
    { name: 'TURQUOISE',         grades: ['STD', 'OPQ/JS'] },
    { name: 'RED SUPER',         grades: ['STD', 'OPQ/JS'] },
    { name: 'RED SCARLET',       grades: ['STD', 'OPQ/JS'] },
    { name: 'KHAKI',             grades: ['OPQ/JS'] },
    { name: 'RAMA GREEN',        grades: ['STD'] },
    { name: 'DARK SUPER RED',    grades: ['LCS'] },
    { name: 'STEEL GREY',        grades: ['OPQ/JS'] },
    { name: 'FLT YGT',           grades: ['OPQ/JS'] },
    { name: 'FLT PINK',          grades: ['OPQ/JS'] },
    { name: 'FLT GREEN',         grades: ['OPQ/JS'] },
    { name: 'FLT ORANGE',        grades: ['OPQ/JS'] },
    { name: 'FLT MAGENTA',       grades: ['OPQ/JS'] },
    { name: 'FLT NEON',          grades: ['OPQ/JS'] },
    { name: 'FLT GOLDEN YELLOW', grades: ['OPQ/JS'] },
    { name: 'BRITE GREEN',       grades: ['STD'] },
    { name: 'FOAN BUFF',         grades: ['OPQ/JS'] },
    { name: 'SKY BLUE',          grades: ['STD'] },
    // Specials / additives — no LCS/STD/OPQ-JS marks in the source catalog.
    { name: 'HIGH DENSITY (HD / SC)', grades: [] },
    { name: 'NEW HD',                 grades: [] },
    { name: 'NEW PUFF',               grades: [] },
    { name: 'PUFF ADDITIVE',          grades: [] },
    { name: 'NEW EMBOSS GELL',        grades: [] },
    { name: 'CLEAR GELL 505',         grades: [] },
    { name: 'WHITE G-5',              grades: [] },
    { name: 'WHITE S-5',              grades: [] },
    { name: 'SUPER WHITE',            grades: [] },
    { name: 'CD 300 WHITE',           grades: [] },
    { name: 'POLAR WHITE',            grades: [] },
    { name: '1 STROKE WHITE',         grades: [] },
];

async function main() {
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
        console.error('ERROR: ADMIN_PASSWORD env var is required for the production seed.');
        console.error('       Set it in .env or export it before running this script.');
        process.exit(1);
    }
    const adminUsername = process.env.ADMIN_USERNAME ?? 'admin';
    const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@example.com';

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // ink_grades, color_ink_grades, and device_enrollment_requests live
        // outside setup-db.ts historically; ensure they exist so this seed is
        // self-sufficient.
        await client.query(`
            CREATE TABLE IF NOT EXISTS ink_grades (
                id SERIAL PRIMARY KEY,
                name VARCHAR(50) UNIQUE NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `);
        await client.query(`
            CREATE TABLE IF NOT EXISTS color_ink_grades (
                color_id INTEGER REFERENCES colors(id) ON DELETE CASCADE,
                grade_id INTEGER REFERENCES ink_grades(id) ON DELETE CASCADE,
                PRIMARY KEY (color_id, grade_id)
            )
        `);
        await client.query(`
            CREATE TABLE IF NOT EXISTS device_enrollment_requests (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
                device VARCHAR(255) NOT NULL,
                location VARCHAR(255),
                status VARCHAR(50) DEFAULT 'pending',
                requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                UNIQUE (user_id, device)
            )
        `);
        await client.query(`
            CREATE TABLE IF NOT EXISTS product_types (
                id SERIAL PRIMARY KEY,
                name VARCHAR(50) UNIQUE NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `);
        await client.query(`
            CREATE TABLE IF NOT EXISTS product_series_categories (
                id SERIAL PRIMARY KEY,
                name VARCHAR(50) UNIQUE NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `);
        await client.query(`
            CREATE TABLE IF NOT EXISTS color_product_types (
                color_id INTEGER REFERENCES colors(id) ON DELETE CASCADE,
                type_id INTEGER REFERENCES product_types(id) ON DELETE CASCADE,
                PRIMARY KEY (color_id, type_id)
            )
        `);
        await client.query(`
            CREATE TABLE IF NOT EXISTS color_product_series (
                color_id INTEGER REFERENCES colors(id) ON DELETE CASCADE,
                series_id INTEGER REFERENCES product_series_categories(id) ON DELETE CASCADE,
                PRIMARY KEY (color_id, series_id)
            )
        `);
        await client.query(`
            CREATE TABLE IF NOT EXISTS app_settings (
                key VARCHAR(100) PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `);
        await client.query(`
            CREATE TABLE IF NOT EXISTS material_requests (
                id SERIAL PRIMARY KEY,
                resource_id INTEGER REFERENCES resources(id) NOT NULL,
                requested_by INTEGER REFERENCES users(id) NOT NULL,
                status VARCHAR(50) DEFAULT 'pending',
                notes TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Suppliers (consolidated from migrations 011, 012, 014, 015).
        await client.query(`
            CREATE TABLE IF NOT EXISTS suppliers (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) UNIQUE NOT NULL,
                contact_person VARCHAR(255),
                email VARCHAR(255),
                phone VARCHAR(50),
                address TEXT NOT NULL DEFAULT 'No recorded address',
                website VARCHAR(255),
                notes TEXT,
                gst_number VARCHAR(20) UNIQUE,
                regulatory_info TEXT,
                pocs JSONB DEFAULT '[]',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `);
        await client.query(`
            ALTER TABLE resources ADD COLUMN IF NOT EXISTS supplier_id INTEGER REFERENCES suppliers(id);
            ALTER TABLE resources ADD COLUMN IF NOT EXISTS color VARCHAR(100);
            ALTER TABLE resources ADD COLUMN IF NOT EXISTS feel VARCHAR(100);
            CREATE INDEX IF NOT EXISTS idx_resources_supplier_id ON resources(supplier_id);
        `);

        // Purchase orders (migration 013).
        await client.query(`
            CREATE TABLE IF NOT EXISTS purchase_orders (
                id SERIAL PRIMARY KEY,
                supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
                status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft','pending','ordered','received','partially_received','cancelled')),
                notes TEXT,
                share_token UUID DEFAULT gen_random_uuid(),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        await client.query(`
            CREATE TABLE IF NOT EXISTS purchase_order_items (
                id SERIAL PRIMARY KEY,
                purchase_order_id INTEGER REFERENCES purchase_orders(id) ON DELETE CASCADE,
                resource_id INTEGER REFERENCES resources(id) ON DELETE SET NULL,
                quantity DECIMAL(12,4) NOT NULL,
                unit VARCHAR(20) NOT NULL,
                unit_price DECIMAL(12,2) DEFAULT 0,
                received_quantity DECIMAL(12,4) DEFAULT 0,
                refunded_quantity DECIMAL(12,4) DEFAULT 0,
                refund_status VARCHAR(50) DEFAULT 'none' CHECK (refund_status IN ('none','pending','completed','rejected')),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_po_supplier_id ON purchase_orders(supplier_id)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_poi_po_id ON purchase_order_items(purchase_order_id)`);

        // Loss tracking (migration 010_create_product_losses).
        await client.query(`
            DO $$ BEGIN
                CREATE TYPE loss_item_type AS ENUM ('finished_good', 'raw_material');
            EXCEPTION WHEN duplicate_object THEN NULL; END $$;
        `);
        await client.query(`
            CREATE TABLE IF NOT EXISTS loss_reasons (
                id SERIAL PRIMARY KEY,
                name VARCHAR(50) UNIQUE NOT NULL,
                description TEXT
            )
        `);
        await client.query(`
            CREATE TABLE IF NOT EXISTS product_losses (
                id SERIAL PRIMARY KEY,
                item_type loss_item_type NOT NULL,
                color_id INTEGER REFERENCES colors(id),
                resource_id INTEGER REFERENCES resources(id),
                pack_size_kg DECIMAL(12,4),
                quantity_units INTEGER,
                quantity_kg DECIMAL(12,4) NOT NULL,
                reason_id INTEGER REFERENCES loss_reasons(id) NOT NULL,
                notes TEXT,
                documented_by INTEGER REFERENCES users(id) NOT NULL,
                documented_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                reference_type VARCHAR(50),
                reference_id INTEGER,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_product_losses_color_id ON product_losses(color_id)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_product_losses_resource_id ON product_losses(resource_id)`);

        // Order fulfillment / returns (migration 007).
        await client.query(`
            ALTER TABLE client_orders ADD COLUMN IF NOT EXISTS shipping_status VARCHAR(50) DEFAULT 'pending';
            ALTER TABLE client_orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);
            ALTER TABLE client_orders ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'pending';
            ALTER TABLE client_orders ADD COLUMN IF NOT EXISTS return_status VARCHAR(50);
            ALTER TABLE client_orders ADD COLUMN IF NOT EXISTS refund_status VARCHAR(50);
        `);
        await client.query(`
            CREATE TABLE IF NOT EXISTS order_returns (
                id SERIAL PRIMARY KEY,
                order_id INTEGER REFERENCES client_orders(id) ON DELETE CASCADE,
                status VARCHAR(50) DEFAULT 'initiated',
                notes TEXT,
                created_by INTEGER REFERENCES users(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                resolved_at TIMESTAMP WITH TIME ZONE
            )
        `);
        await client.query(`
            CREATE TABLE IF NOT EXISTS order_return_items (
                id SERIAL PRIMARY KEY,
                return_id INTEGER REFERENCES order_returns(id) ON DELETE CASCADE,
                order_item_id INTEGER REFERENCES client_order_items(id) ON DELETE CASCADE,
                quantity INTEGER NOT NULL,
                qc_status VARCHAR(50) DEFAULT 'pending_inspection'
            )
        `);

        // Column additions to existing tables (migrations 003, 010_color_approval, 011_link_production).
        await client.query(`
            ALTER TABLE colors ADD COLUMN IF NOT EXISTS hsn_code VARCHAR(50);
            ALTER TABLE colors ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;
            ALTER TABLE colors ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'approved';
            ALTER TABLE colors ADD COLUMN IF NOT EXISTS requested_by INTEGER REFERENCES users(id);
        `);
        await client.query(`UPDATE colors SET approval_status = 'approved' WHERE approval_status IS NULL`);
        await client.query(`
            ALTER TABLE production_runs ADD COLUMN IF NOT EXISTS ink_series VARCHAR(20);
            ALTER TABLE production_runs ADD COLUMN IF NOT EXISTS order_id INTEGER REFERENCES client_orders(id);
            ALTER TABLE production_runs ADD COLUMN IF NOT EXISTS client_name VARCHAR(255);
            ALTER TABLE production_runs ADD COLUMN IF NOT EXISTS order_date TIMESTAMP WITH TIME ZONE;
        `);

        // Production actuals UNIQUE constraint (migration 008).
        await client.query(`
            DO $$ BEGIN
                ALTER TABLE production_resource_actuals
                    ADD CONSTRAINT unique_production_run_resource UNIQUE (production_run_id, resource_id);
            EXCEPTION WHEN duplicate_table OR duplicate_object THEN NULL; END $$;
        `);

        // Default product types, app settings, loss reasons (idempotent).
        for (const t of ['Water Based Ink', 'Oil Based Ink']) {
            await client.query(
                'INSERT INTO product_types (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
                [t]
            );
        }
        await client.query(
            `INSERT INTO app_settings (key, value) VALUES ('low_stock_threshold', '20')
             ON CONFLICT (key) DO NOTHING`
        );
        const lossReasonDefaults: [string, string][] = [
            ['Damaged',         'Product physically damaged in warehouse or transit'],
            ['Expired',         'Product exceeded shelf life'],
            ['Spillage',        'Accidental release or spillage'],
            ['QC Failure',      'Quality control check failed'],
            ['Shipping Loss',   'Lost during delivery to customer'],
            ['Customer Return', 'Returned by customer in unsellable condition'],
            ['Other',           'Miscellaneous documentation'],
        ];
        for (const [name, description] of lossReasonDefaults) {
            await client.query(
                `INSERT INTO loss_reasons (name, description) VALUES ($1, $2)
                 ON CONFLICT (name) DO NOTHING`,
                [name, description]
            );
        }

        console.log('Seeding roles...');
        for (const r of ROLES) {
            await client.query(
                'INSERT INTO roles (name, description) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING',
                [r.name, r.description]
            );
        }

        console.log('Seeding ink grades...');
        for (const g of GRADES) {
            await client.query(
                'INSERT INTO ink_grades (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
                [g]
            );
        }

        const gradesRes = await client.query('SELECT id, name FROM ink_grades');
        const gradeIdByName: Record<string, number> = {};
        for (const row of gradesRes.rows) {
            gradeIdByName[row.name] = row.id;
        }

        console.log('Ensuring admin user...');
        const adminRoleRes = await client.query("SELECT id FROM roles WHERE name = 'admin'");
        const adminRoleId = adminRoleRes.rows[0].id;

        const existingAdmin = await client.query(
            'SELECT id, username FROM users WHERE username = $1 OR email = $2',
            [adminUsername, adminEmail]
        );
        if (existingAdmin.rows.length === 0) {
            const passwordHash = await bcrypt.hash(adminPassword, 10);
            const insertedAdmin = await client.query(
                `INSERT INTO users (username, email, password_hash, role_id, is_active)
                 VALUES ($1, $2, $3, $4, TRUE) RETURNING id`,
                [adminUsername, adminEmail, passwordHash, adminRoleId]
            );
            // Pre-approve common browser devices so the admin can log in without
            // first being held in pending enrollment.
            const adminId = insertedAdmin.rows[0].id;
            for (const device of ['Chrome', 'Safari', 'Firefox', 'Edge']) {
                await client.query(
                    `INSERT INTO device_enrollment_requests (user_id, device, location, status)
                     VALUES ($1, $2, 'Initial', 'approved')
                     ON CONFLICT (user_id, device) DO NOTHING`,
                    [adminId, device]
                );
            }
            console.log(`  Admin '${adminUsername}' <${adminEmail}> created with pre-approved devices.`);
        } else {
            console.log(`  Admin '${existingAdmin.rows[0].username}' already exists — password not changed.`);
        }

        console.log(`Seeding ${COLORS.length} colors...`);
        for (const c of COLORS) {
            const existing = await client.query('SELECT id FROM colors WHERE name = $1', [c.name]);
            let colorId: number;
            if (existing.rows.length > 0) {
                colorId = existing.rows[0].id;
            } else {
                const insertRes = await client.query(
                    'INSERT INTO colors (name, min_threshold_kg) VALUES ($1, 0) RETURNING id',
                    [c.name]
                );
                colorId = insertRes.rows[0].id;
            }

            for (const g of c.grades) {
                const gid = gradeIdByName[g];
                if (!gid) continue;
                await client.query(
                    'INSERT INTO color_ink_grades (color_id, grade_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                    [colorId, gid]
                );
            }
        }

        await client.query('COMMIT');
        console.log('Production seed complete.');
        process.exit(0);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Production seed failed:', err);
        process.exit(1);
    } finally {
        client.release();
    }
}

main();
