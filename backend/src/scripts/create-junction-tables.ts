import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function createTables() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Create base tables
        await client.query(`
            CREATE TABLE IF NOT EXISTS product_types (
                id SERIAL PRIMARY KEY,
                name VARCHAR(50) UNIQUE NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        
        await client.query(`
            CREATE TABLE IF NOT EXISTS product_series_categories (
                id SERIAL PRIMARY KEY,
                name VARCHAR(50) UNIQUE NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Create junction tables
        await client.query(`
            CREATE TABLE IF NOT EXISTS color_product_types (
                color_id INTEGER REFERENCES colors(id) ON DELETE CASCADE,
                type_id INTEGER REFERENCES product_types(id) ON DELETE CASCADE,
                PRIMARY KEY (color_id, type_id)
            );
        `);
        
        await client.query(`
            CREATE TABLE IF NOT EXISTS color_product_series (
                color_id INTEGER REFERENCES colors(id) ON DELETE CASCADE,
                series_id INTEGER REFERENCES product_series_categories(id) ON DELETE CASCADE,
                PRIMARY KEY (color_id, series_id)
            );
        `);
        
        await client.query(`
            CREATE TABLE IF NOT EXISTS color_ink_grades (
                color_id INTEGER REFERENCES colors(id) ON DELETE CASCADE,
                grade_id INTEGER REFERENCES ink_grades(id) ON DELETE CASCADE,
                PRIMARY KEY (color_id, grade_id)
            );
        `);

        await client.query('COMMIT');
        console.log('Successfully created all missing junction and category tables.');
        process.exit(0);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error:', err);
        process.exit(1);
    } finally {
        client.release();
    }
}

createTables();
