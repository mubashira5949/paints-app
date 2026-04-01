import { Pool } from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URKG,
    ssl: {
        rejectUnauthorized: false
    }
});

async function seed() {
    try {
        console.log('Starting database seed...');

        // 1. Get User ID (Assuming admin user exists or creating a default one)
        let userRes = await pool.query("SELECT id FROM users LIMIT 1");
        let userId;
        if (userRes.rows.length === 0) {
            const passwordHash = await bcrypt.hash('password123', 10);
            const roleRes = await pool.query("SELECT id FROM roles WHERE name = 'admin' LIMIT 1");
            let roleId = roleRes.rows[0]?.id;
            
            if (!roleId) {
                const newRole = await pool.query("INSERT INTO roles (name, description) VALUES ('admin', 'Admin') RETURNING id");
                roleId = newRole.rows[0].id;
            }

            const newUser = await pool.query(
                "INSERT INTO users (username, email, password_hash, role_id) VALUES ($1, $2, $3, $4) RETURNING id",
                ['admin', 'admin@example.com', passwordHash, roleId]
            );
            userId = newUser.rows[0].id;
        } else {
            userId = userRes.rows[0].id;
        }

        // 2. Resources (Raw Materials)
        console.log('Inserting resources...');
        await pool.query(`
            INSERT INTO resources (name, description, unit, current_stock, reorder_level)
            VALUES 
                ('Titanium Dioxide', 'White pigment', 'kg', 15.5, 50.0), -- Critical
                ('Binder A', 'Acrylic resin', 'KG', 20.0, 100.0), -- Critical
                ('Solvent X', 'Primary solvent', 'KG', 150.0, 100.0), -- Good
                ('Red Pigment 40', 'Colorant', 'kg', 5.0, 10.0), -- Low
                ('Blue Pigment 20', 'Colorant', 'kg', 45.0, 20.0), -- Good
                ('Calcium Carbonate', 'Filler', 'kg', 500.0, 200.0) -- Good
            ON CONFLICT (name) DO UPDATE 
            SET current_stock = EXCLUDED.current_stock, reorder_level = EXCLUDED.reorder_level;
        `);

        // 3. Colors
        console.log('Inserting colors...');
        await pool.query(`
            INSERT INTO colors (name, color_code, business_code, series)
            VALUES 
                ('Ocean Blue', '#0055A4', 'OB-100', 'Premium Interior'),
                ('Sunset Red', '#FF4500', 'SR-200', 'Standard Exterior'),
                ('Cloud White', '#FFFFFF', 'CW-300', 'Base Coat')
            ON CONFLICT (name) DO NOTHING;
        `);

        // 4. Formulas
        console.log('Inserting formulas...');
        const oceanBlueId = (await pool.query("SELECT id FROM colors WHERE name = 'Ocean Blue'")).rows[0].id;
        const sunsetRedId = (await pool.query("SELECT id FROM colors WHERE name = 'Sunset Red'")).rows[0].id;
        const cloudWhiteId = (await pool.query("SELECT id FROM colors WHERE name = 'Cloud White'")).rows[0].id;

        await pool.query(`
            INSERT INTO formulas (color_id, name, batch_size_kg)
            VALUES 
                ($1, 'Ocean Blue Standard', 100),
                ($2, 'Sunset Red Exterior', 150),
                ($3, 'Cloud White Base', 200)
            -- simplified, real app would check conflict or just run once
        `, [oceanBlueId, sunsetRedId, cloudWhiteId]).catch(e => console.log('Formulas might exist, skipping error'));

        // 5. Finished Stock
        console.log('Inserting finished stock...');
        await pool.query(`
            INSERT INTO finished_stock (color_id, pack_size_kg, quantity_units)
            VALUES 
                ($1, 5, 120),
                ($1, 20, 45),
                ($2, 5, 80),
                ($2, 20, 25),
                ($3, 10, 200),
                ($3, 20, 150)
            ON CONFLICT (color_id, pack_size_kg) DO UPDATE
            SET quantity_units = EXCLUDED.quantity_units;
        `, [oceanBlueId, sunsetRedId, cloudWhiteId]);

        // 6. Production Runs (Recent)
        console.log('Inserting production runs...');
        const oceanFormulaId = (await pool.query("SELECT id FROM formulas WHERE color_id = $1 LIMIT 1", [oceanBlueId])).rows[0]?.id;
        const sunsetFormulaId = (await pool.query("SELECT id FROM formulas WHERE color_id = $1 LIMIT 1", [sunsetRedId])).rows[0]?.id;
        const whiteFormulaId = (await pool.query("SELECT id FROM formulas WHERE color_id = $1 LIMIT 1", [cloudWhiteId])).rows[0]?.id;

        if (oceanFormulaId && sunsetFormulaId && whiteFormulaId) {
             await pool.query(`
                INSERT INTO production_runs (formula_id, status, planned_quantity_kg, actual_quantity_kg, created_by, created_at)
                VALUES 
                    ($1, 'completed', 100, 102, $4, NOW() - INTERVAKG '1 hour'),
                    ($2, 'completed', 150, 148, $4, NOW() - INTERVAKG '3 hours'),
                    ($3, 'in_progress', 200, NULKG, $4, NOW() - INTERVAKG '30 minutes'),
                    ($1, 'planned', 100, NULKG, $4, NOW()),
                    ($2, 'completed', 150, 150, $4, NOW() - INTERVAKG '1 day')
             `, [oceanFormulaId, sunsetFormulaId, whiteFormulaId, userId]);
        }
        
        // 7. Historical Production Runs for Chart (Spread over last 5 months)
        console.log('Inserting historical production runs for charts...');
        if (oceanFormulaId) {
            await pool.query(`
                INSERT INTO production_runs (formula_id, status, planned_quantity_kg, actual_quantity_kg, created_by, created_at)
                SELECT 
                    $1, 'completed', 100, 100, $2, 
                    NOW() - (random() * interval '150 days')
                FROM generate_series(1, 40)
            `, [oceanFormulaId, userId]);
        }

        console.log('Database seeded successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Error seeding database:', err);
        process.exit(1);
    }
}

seed();
