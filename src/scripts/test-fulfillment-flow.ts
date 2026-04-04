import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { 
        rejectUnauthorized: false,
        servername: 'db.neon.tech'
    }
});

async function runTest() {
    console.log('Testing the fulfillment and returns schema...');
    
    try {
        // 1. Create a dummy client
        const clientRes = await pool.query(`
            INSERT INTO clients (name, gst_number, contact_name, contact_email)
            VALUES ('Test Client', 'GST-TEST-123', 'John Doe', 'john@test.com')
            ON CONFLICT (gst_number) DO UPDATE SET name = EXCLUDED.name
            RETURNING id;
        `);
        const clientId = clientRes.rows[0].id;

        // 2. Insert dummy user to fulfill constraints
        const userRes = await pool.query(`
            INSERT INTO users (username, email, password_hash)
            VALUES ('testuser_fulfillment', 'test_fulfillment@paints.com', 'hash')
            ON CONFLICT (username) DO UPDATE SET email = EXCLUDED.email
            RETURNING id;
        `);
        const userId = userRes.rows[0].id;

        // 3. Create a Client Order with new tracking columns
        const orderRes = await pool.query(`
            INSERT INTO client_orders (client_id, client_name, shipping_status, payment_method, payment_status, created_by)
            VALUES ($1, 'Test Client', 'delivered', 'online', 'completed', $2)
            RETURNING id;
        `, [clientId, userId]);
        const orderId = orderRes.rows[0].id;
        console.log(`Created Order #${orderId} with status 'delivered' and payment 'completed'`);

        // 4. Create dummy color for order item
        const colorRes = await pool.query(`
            INSERT INTO colors (name, color_code, business_code)
            VALUES ('Test Color', '#FFFFFF', 'TC-TEST')
            ON CONFLICT (name) DO UPDATE SET color_code = EXCLUDED.color_code
            RETURNING id;
        `);
        const colorId = colorRes.rows[0].id;

        // 5. Create Order Item
        const orderItemRes = await pool.query(`
            INSERT INTO client_order_items (order_id, color_id, pack_size_kg, quantity)
            VALUES ($1, $2, 10, 5)
            RETURNING id;
        `, [orderId, colorId]);
        const orderItemId = orderItemRes.rows[0].id;
        console.log(`Created Order Item #${orderItemId} for Order #${orderId}`);

        // 6. Initiate a Return
        const returnRes = await pool.query(`
            INSERT INTO order_returns (order_id, status, notes, created_by)
            VALUES ($1, 'return_initiated', 'Product damaged during transit', $2)
            RETURNING id;
        `, [orderId, userId]);
        const returnId = returnRes.rows[0].id;
        console.log(`Initiated Return #${returnId} for Order #${orderId}`);

        // 7. Add Return Items to QC
        const returnItemRes = await pool.query(`
            INSERT INTO order_return_items (return_id, order_item_id, quantity, qc_status)
            VALUES ($1, $2, 2, 'pending_inspection')
            RETURNING id;
        `, [returnId, orderItemId]);
        const returnItemId = returnItemRes.rows[0].id;
        console.log(`Added Return Item #${returnItemId} for Return #${returnId} pending QC`);

        // Update the order columns to reflect the refund status natively
        await pool.query(`
            UPDATE client_orders 
            SET return_status = 'in_storage', refund_status = 'initiated' 
            WHERE id = $1;
        `, [orderId]);

        console.log(`\nTest Passed: Successfully walked through the Delivered -> Return -> Refund Initiation lifecycle mapping.`);

        // Clean up test data
        await pool.query(`DELETE FROM order_returns WHERE id = $1`, [returnId]);
        await pool.query(`DELETE FROM client_orders WHERE id = $1`, [orderId]);
        await pool.query(`DELETE FROM colors WHERE id = $1`, [colorId]);
        await pool.query(`DELETE FROM clients WHERE id = $1`, [clientId]);

    } catch (err) {
        console.error('Test Failed:', err);
    } finally {
        await pool.end();
    }
}

runTest();
