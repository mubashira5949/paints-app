import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function seedLosses() {
    console.log('Seeding demo data into product_losses table...');
    try {
        // Query users, colors, and resources to link with valid IDs
        const userRes = await pool.query("SELECT id FROM users LIMIT 1");
        const colorRes = await pool.query("SELECT id FROM colors LIMIT 3");
        const resourceRes = await pool.query("SELECT id FROM resources LIMIT 3");
        const reasonRes = await pool.query("SELECT id FROM loss_reasons LIMIT 3");

        if (userRes.rows.length === 0) {
            console.error("No users found in database");
            process.exit(1);
        }
        if (reasonRes.rows.length === 0) {
            console.error("No loss reasons found in database. Run migration 010 first.");
            process.exit(1);
        }

        const userId = userRes.rows[0].id;
        const reasonId = reasonRes.rows[0].id;
        const secondReasonId = reasonRes.rows[1]?.id || reasonId;

        // Clear existing demo losses to prevent duplicate key/bloat
        await pool.query("DELETE FROM product_losses");

        // Insert Finished Goods (Colors) Losses
        for (const color of colorRes.rows) {
            await pool.query(
                `INSERT INTO product_losses (
                    item_type, color_id, resource_id, pack_size_kg, quantity_units, quantity_kg, reason_id, notes, documented_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                ['finished_good', color.id, null, 10.0, 5, 50.0, reasonId, 'Accidental spillage during moving', userId]
            );
        }

        // Insert Raw Materials (Resources) Losses
        for (const res of resourceRes.rows) {
            await pool.query(
                `INSERT INTO product_losses (
                    item_type, color_id, resource_id, pack_size_kg, quantity_units, quantity_kg, reason_id, notes, documented_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                ['raw_material', null, res.id, null, null, 25.0, secondReasonId, 'Material damaged due to shelf-life expiration', userId]
            );
        }

        console.log('Successfully seeded demo loss data.');
        process.exit(0);
    } catch (err) {
        console.error('Error seeding losses demo data:', err);
        process.exit(1);
    }
}

seedLosses();
