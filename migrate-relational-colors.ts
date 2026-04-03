import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('--- Starting Relational Migration ---');
        await client.query('BEGIN');

        // 1. Create product_series_categories table (e.g. Ink Series, High Density)
        console.log('Creating product_series_categories table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS product_series_categories (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 2. Create ink_grades table (e.g. LCS, STD, OPQ, JS)
        console.log('Creating ink_grades table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS ink_grades (
                id SERIAL PRIMARY KEY,
                name VARCHAR(50) UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 3. Create junction tables
        console.log('Creating junction tables...');
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
            CREATE TABLE IF NOT EXISTS color_ink_grades (
                color_id INTEGER REFERENCES colors(id) ON DELETE CASCADE,
                grade_id INTEGER REFERENCES ink_grades(id) ON DELETE CASCADE,
                PRIMARY KEY (color_id, grade_id)
            )
        `);

        // 4. Seed initial categories and grades
        console.log('Seeding initial categories and grades...');
        const initialSeries = ['Ink Series', 'High Density', 'Special', 'Water Based'];
        for (const s of initialSeries) {
            await client.query('INSERT INTO product_series_categories (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [s]);
        }
        const initialGrades = ['LCS', 'STD', 'OPQ', 'JS'];
        for (const g of initialGrades) {
            await client.query('INSERT INTO ink_grades (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [g]);
        }

        // 5. Migrate data from colors table
        console.log('Migrating existing color associations...');
        const colorsRes = await client.query('SELECT id, series, product_type, available_lcs, available_std, available_opq_js FROM colors');
        
        for (const row of colorsRes.rows) {
            const colorId = row.id;

            // Migrate Product Types (JSONB)
            if (row.product_type && Array.isArray(row.product_type)) {
                for (const typeName of row.product_type) {
                    const typeRes = await client.query('SELECT id FROM product_types WHERE name = $1', [typeName]);
                    if (typeRes.rows.length > 0) {
                        await client.query('INSERT INTO color_product_types (color_id, type_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [colorId, typeRes.rows[0].id]);
                    }
                }
            }

            // Migrate Series (Category)
            if (row.series) {
                const seriesRes = await client.query('SELECT id FROM product_series_categories WHERE name = $1', [row.series]);
                if (seriesRes.rows.length > 0) {
                    await client.query('INSERT INTO color_product_series (color_id, series_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [colorId, seriesRes.rows[0].id]);
                }
            }

            // Migrate Grades (Flags)
            if (row.available_lcs) {
                const gradeRes = await client.query('SELECT id FROM ink_grades WHERE name = $1', ['LCS']);
                await client.query('INSERT INTO color_ink_grades (color_id, grade_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [colorId, gradeRes.rows[0].id]);
            }
            if (row.available_std) {
                const gradeRes = await client.query('SELECT id FROM ink_grades WHERE name = $1', ['STD']);
                await client.query('INSERT INTO color_ink_grades (color_id, grade_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [colorId, gradeRes.rows[0].id]);
            }
            if (row.available_opq_js) {
                const gradeRes = await client.query('SELECT id FROM ink_grades WHERE name = $1', ['OPQ']); // Map to OPQ and JS if needed, but the user said LCS, STD, OPQ/JS
                await client.query('INSERT INTO color_ink_grades (color_id, grade_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [colorId, gradeRes.rows[0].id]);
                
                // Also add JS grade
                const jsRes = await client.query('SELECT id FROM ink_grades WHERE name = $1', ['JS']);
                await client.query('INSERT INTO color_ink_grades (color_id, grade_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [colorId, jsRes.rows[0].id]);
            }
        }

        await client.query('COMMIT');
        console.log('--- Relational Migration Completed Successfully ---');
        process.exit(0);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', err);
        process.exit(1);
    } finally {
        client.release();
    }
}

migrate();
