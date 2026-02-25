
import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function seed() {
    try {
        console.log('Seeding initial manager user...');

        // 1. Get manager role ID
        const roleResult = await pool.query('SELECT id FROM roles WHERE name = $1', ['manager']);
        if (roleResult.rows.length === 0) {
            console.error('Manager role not found. Please run setup-db or seed-roles first.');
            process.exit(1);
        }
        const roleId = roleResult.rows[0].id;

        // 2. Hash password
        const password = 'managerpassword';
        const hashedPassword = await bcrypt.hash(password, 10);

        // 3. Insert user
        await pool.query(
            'INSERT INTO users (username, password_hash, role_id) VALUES ($1, $2, $3) ON CONFLICT (username) DO NOTHING',
            ['initial_manager', hashedPassword, roleId]
        );

        console.log('Initial manager user created!');
        console.log('Username: initial_manager');
        console.log('Password: managerpassword');
        process.exit(0);
    } catch (err) {
        console.error('Error seeding manager:', err);
        process.exit(1);
    }
}

seed();
