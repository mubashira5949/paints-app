import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function seedInkGrades() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS ink_grades (
                id SERIAL PRIMARY KEY,
                name VARCHAR(50) UNIQUE NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        
        const grades = ['LCS', 'STD', 'OPQ/JS'];
        
        for (const grade of grades) {
            await pool.query(
                `INSERT INTO ink_grades (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`,
                [grade]
            );
        }
        
        console.log('Successfully seeded ink grades');
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

seedInkGrades();
