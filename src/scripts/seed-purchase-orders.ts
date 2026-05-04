import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function seed() {
    console.log('Seeding demo Purchase Orders data...');
    try {
        // Clear any existing PO items first
        await pool.query('DELETE FROM purchase_order_items');
        await pool.query('DELETE FROM purchase_orders');

        // Insert PO 1 - Ordered status
        const po1 = await pool.query(
            `INSERT INTO purchase_orders (supplier_id, status, notes)
             VALUES ($1, $2, $3) RETURNING id`,
            [2, 'ordered', 'Urgent restocking for upcoming production run.']
        );
        const po1Id = po1.rows[0].id;

        await pool.query(
            `INSERT INTO purchase_order_items (purchase_order_id, resource_id, quantity, unit, unit_price, received_quantity)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [po1Id, 1, 500.0, 'kg', 25.50, 0]
        );
        await pool.query(
            `INSERT INTO purchase_order_items (purchase_order_id, resource_id, quantity, unit, unit_price, received_quantity)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [po1Id, 7, 120.0, 'kg', 45.00, 0]
        );

        // Insert PO 2 - Received status
        const po2 = await pool.query(
            `INSERT INTO purchase_orders (supplier_id, status, notes)
             VALUES ($1, $2, $3) RETURNING id`,
            [3, 'received', 'Monthly solvent supply']
        );
        const po2Id = po2.rows[0].id;

        await pool.query(
            `INSERT INTO purchase_order_items (purchase_order_id, resource_id, quantity, unit, unit_price, received_quantity)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [po2Id, 6, 1000.0, 'kg', 12.00, 1000.0]
        );
        await pool.query(
            `INSERT INTO purchase_order_items (purchase_order_id, resource_id, quantity, unit, unit_price, received_quantity)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [po2Id, 5, 800.0, 'kg', 14.50, 800.0]
        );

        // Insert PO 3 - Draft status
        const po3 = await pool.query(
            `INSERT INTO purchase_orders (supplier_id, status, notes)
             VALUES ($1, $2, $3) RETURNING id`,
            [4, 'draft', 'Demo test for AXIME supplier draft']
        );
        const po3Id = po3.rows[0].id;

        await pool.query(
            `INSERT INTO purchase_order_items (purchase_order_id, resource_id, quantity, unit, unit_price, received_quantity)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [po3Id, 2, 250.0, 'kg', 18.00, 0]
        );

        // Insert PO 4 - Pending status
        const po4 = await pool.query(
            `INSERT INTO purchase_orders (supplier_id, status, notes)
             VALUES ($1, $2, $3) RETURNING id`,
            [4, 'pending', 'Standard replenishment']
        );
        const po4Id = po4.rows[0].id;

        await pool.query(
            `INSERT INTO purchase_order_items (purchase_order_id, resource_id, quantity, unit, unit_price, received_quantity)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [po4Id, 3, 300.0, 'kg', 32.00, 0]
        );

        console.log('Seeding of Purchase Orders completed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Error seeding Purchase Orders:', err);
        process.exit(1);
    }
}

seed();
