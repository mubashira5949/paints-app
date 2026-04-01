import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkUsers() {
    try {
        const result = await pool.query(`
            SELECT u.username, u.email, r.name as role
            FROM users u
            JOIN roles r ON u.role_id = r.id
        `);
        console.log(JSON.stringify(result.rows, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
checkUsers();
