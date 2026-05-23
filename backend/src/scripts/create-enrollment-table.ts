import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function createTable() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS device_enrollment_requests (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
                device VARCHAR(255) NOT NULL,
                location VARCHAR(255),
                status VARCHAR(50) DEFAULT 'pending',
                requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                UNIQUE (user_id, device)
            );
        `);
        console.log('Successfully created device_enrollment_requests table');
        
        // Also ensure the user we created earlier has an 'approved' device enrollment
        // so they can log in without waiting for approval
        const userRes = await pool.query("SELECT id FROM users WHERE email = 'manager@gmail.com'");
        if (userRes.rows.length > 0) {
            const userId = userRes.rows[0].id;
            await pool.query(`
                INSERT INTO device_enrollment_requests (user_id, device, location, status)
                VALUES ($1, 'Chrome', 'Demo Site', 'approved')
                ON CONFLICT (user_id, device) DO UPDATE SET status = 'approved'
            `, [userId]);
            console.log('Added approved device for manager');
        }
        
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

createTable();
