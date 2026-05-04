import { Pool } from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function addDemoUsers() {
    try {
        const rolesRes = await pool.query("SELECT id, name FROM roles");
        const roles = rolesRes.rows;
        
        const operatorRole = roles.find(r => r.name === 'operator');
        const salesRole = roles.find(r => r.name === 'sales');
        
        if (!operatorRole || !salesRole) {
            console.error("Operator or Sales roles not found in DB");
            process.exit(1);
        }
        
        const operatorPasswordHash = await bcrypt.hash('operatorpassword', 10);
        const salesPasswordHash = await bcrypt.hash('salespassword', 10);
        
        // Insert Operator
        await pool.query(
            `INSERT INTO users (username, email, password_hash, role_id, is_active) 
             VALUES ($1, $2, $3, $4, TRUE) 
             ON CONFLICT (email) DO UPDATE SET 
                username = EXCLUDED.username,
                password_hash = EXCLUDED.password_hash, 
                role_id = EXCLUDED.role_id,
                is_active = TRUE`,
            ['operator_demo', 'operator@gmail.com', operatorPasswordHash, operatorRole.id]
        );
        
        // Insert Sales
        await pool.query(
            `INSERT INTO users (username, email, password_hash, role_id, is_active) 
             VALUES ($1, $2, $3, $4, TRUE) 
             ON CONFLICT (email) DO UPDATE SET 
                username = EXCLUDED.username,
                password_hash = EXCLUDED.password_hash, 
                role_id = EXCLUDED.role_id,
                is_active = TRUE`,
            ['sales_demo', 'sales@gmail.com', salesPasswordHash, salesRole.id]
        );
        
        console.log('Successfully added operator and sales users');
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

addDemoUsers();
