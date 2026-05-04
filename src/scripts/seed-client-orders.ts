import { Pool } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { 
        rejectUnauthorized: false,
        ca: fs.readFileSync(process.env.DB_SSL_ROOT_CERT || 'global-bundle.pem').toString() 
    }
});

async function seedClientOrders() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        console.log('Fetching user and color data...');

        // Get User
        const userRes = await client.query('SELECT id FROM users LIMIT 1');
        if (userRes.rows.length === 0) throw new Error('No users found.');
        const userId = userRes.rows[0].id;

        // Get Color
        const colorRes = await client.query('SELECT id, name FROM colors LIMIT 2');
        if (colorRes.rows.length === 0) throw new Error('No colors found.');
        const color1 = colorRes.rows[0];
        const color2 = colorRes.rows.length > 1 ? colorRes.rows[1] : color1;

        console.log('Seeding Clients...');
        
        const upsertClient = async (name: string, gst: string, email: string) => {
            const existing = await client.query('SELECT id FROM clients WHERE name = $1', [name]);
            if (existing.rows.length > 0) return existing.rows[0].id;
            
            const res = await client.query(`
                INSERT INTO clients (name, gst_number, contact_email, created_by)
                VALUES ($1, $2, $3, $4)
                RETURNING id
            `, [name, gst, email, userId]);
            return res.rows[0].id;
        };

        const client1Id = await upsertClient('Asian Paints Ltd', '27AABCA1234D1Z5', 'procurement@asianpaints.com');
        const client2Id = await upsertClient('Berger Paints', '19AABCB5678E1Z6', 'orders@berger.com');

        console.log('Seeding Orders...');

        const insertOrder = async (clientId: number, clientName: string, status: string, shippingStatus: string | null, notes: string, dateOffset: number, items: any[]) => {
            const date = new Date();
            date.setDate(date.getDate() - dateOffset);
            
            const res = await client.query(`
                INSERT INTO client_orders (client_id, client_name, status, shipping_status, notes, created_by, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING id
            `, [clientId, clientName, status, shippingStatus, notes, userId, date]);
            const orderId = res.rows[0].id;

            for (const item of items) {
                await client.query(`
                    INSERT INTO client_order_items (order_id, color_id, pack_size_kg, quantity)
                    VALUES ($1, $2, $3, $4)
                `, [orderId, item.colorId, item.packSizeKg, item.qty]);
            }
        };

        // Order 1: Pending (Requires production)
        await insertOrder(
            client1Id, 'Asian Paints Ltd', 'pending', 'pending', 'Urgent order for Q3 project', 0,
            [{ colorId: color1.id, packSizeKg: 20, qty: 50 }, { colorId: color2.id, packSizeKg: 5, qty: 100 }]
        );

        // Order 2: In Progress (Packed but not shipped)
        await insertOrder(
            client2Id, 'Berger Paints', 'in_progress', 'packed', 'Standard delivery', 1,
            [{ colorId: color1.id, packSizeKg: 10, qty: 30 }]
        );

        // Order 3: Fulfilled (Delivered)
        await insertOrder(
            client1Id, 'Asian Paints Ltd', 'fulfilled', 'delivered', 'Previous month order', 10,
            [{ colorId: color2.id, packSizeKg: 20, qty: 200 }]
        );

        await client.query('COMMIT');
        console.log('Successfully seeded client orders!');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error seeding client orders:', err);
    } finally {
        client.release();
        process.exit(0);
    }
}

seedClientOrders();
