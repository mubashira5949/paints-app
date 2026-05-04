import { Pool } from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function addUser() {
    try {
        const rolesRes = await pool.query("SELECT id FROM roles WHERE name = 'manager'");
        if (rolesRes.rows.length === 0) {
            console.error("Manager role not found");
            process.exit(1);
        }
        const roleId = rolesRes.rows[0].id;
        
        const passwordHash = await bcrypt.hash('managerpassword', 10);
        
        const userRes = await pool.query(
            `INSERT INTO users (username, email, password_hash, role_id, is_active) 
             VALUES ($1, $2, $3, $4, TRUE) 
             ON CONFLICT (email) DO UPDATE SET 
                username = EXCLUDED.username,
                password_hash = EXCLUDED.password_hash, 
                role_id = EXCLUDED.role_id,
                is_active = TRUE
             RETURNING id`,
            ['initial_manager', 'manager@gmail.com', passwordHash, roleId]
        );
        
        const userId = userRes.rows[0].id;
        
        console.log('Successfully added initial_manager');
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

addUser();
