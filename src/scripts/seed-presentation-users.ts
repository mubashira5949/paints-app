import { Pool } from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function seedPresentationUsers() {
    try {
        console.log('Starting presentation user seeding...');

        // 1. Get role IDs
        const rolesRes = await pool.query("SELECT id, name FROM roles");
        const rolesMap = rolesRes.rows.reduce((acc, row) => {
            acc[row.name] = row.id;
            return acc;
        }, {} as Record<string, number>);

        const users = [...Array(15).fill(null).map((_, i) => ({ username: `testuser${i}`, email: `test${i}@example.com`, password: "password123", role: "operator" })),
            { username: 'manager', email: 'manager@paintsapp.com', password: 'managerpassword', role: 'manager' },
            { username: 'operator', email: 'operator@paintsapp.com', password: 'operatorpassword', role: 'operator' },
            { username: 'sales', email: 'sales@paintsapp.com', password: 'salespassword', role: 'sales' }
        ];

        for (const user of users) {
            const roleId = rolesMap[user.role];
            if (!roleId) {
                console.error(`Role ${user.role} not found, skipping user ${user.username}`);
                continue;
            }

            const passwordHash = await bcrypt.hash(user.password, 10);

            // Upsert user
            const userRes = await pool.query(
                `INSERT INTO users (username, email, password_hash, role_id, is_active) 
                 VALUES ($1, $2, $3, $4, TRUE) 
                 ON CONFLICT (email) DO UPDATE SET 
                    password_hash = EXCLUDED.password_hash, 
                    role_id = EXCLUDED.role_id,
                    is_active = TRUE
                 RETURNING id`,
                [user.username, user.email, passwordHash, roleId]
            );

            const userId = userRes.rows[0].id;

            // Ensure device enrollment is approved (assuming device name 'Chrome' for demo)
            await pool.query(
                `INSERT INTO device_enrollment_requests (user_id, device, location, status)
                 VALUES ($1, 'Chrome', 'Demo Site', 'approved')
                 ON CONFLICT DO NOTHING`,
                [userId]
            );

            console.log(`✅ User ${user.email} ensured with password ${user.password}`);
        }

        console.log('Presentation users seeded successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Error seeding presentation users:', err);
        process.exit(1);
    }
}

seedPresentationUsers();
