import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function test() {
  const result = await db.query(`
    SELECT 
        i.color_id,
        c.name as color_name,
        json_agg(
            json_build_object(
                'order_id', o.id,
                'client_name', COALESCE(cl.name, o.client_name),
                'order_date', o.created_at,
                'quantity_kg', i.quantity * i.pack_size_kg
            )
        ) as detailed_orders
    FROM client_orders o
    JOIN client_order_items i ON o.id = i.order_id
    JOIN colors c ON i.color_id = c.id
    LEFT JOIN clients cl ON o.client_id = cl.id
    WHERE o.status = 'pending'
    GROUP BY i.color_id, c.name
  `);
  console.dir(result.rows, { depth: null });
  process.exit();
}
test();
