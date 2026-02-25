
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

const roles = [
    { name: 'manager', description: 'Production and Inventory Manager' },
    { name: 'operator', description: 'Production floor operator' },
    { name: 'sales', description: 'Sales and order management' },
    { name: 'client', description: 'External client access' },
    { name: 'admin', description: 'Super Administrator' }
];

async function seed() {
    try {
        console.log('Seeding default roles...');

        for (const role of roles) {
            await pool.query(
                'INSERT INTO roles (name, description) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING',
                [role.name, role.description]
            );
        }

        console.log('Roles seeded successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Error seeding roles:', err);
        process.exit(1);
    }
}

seed();
