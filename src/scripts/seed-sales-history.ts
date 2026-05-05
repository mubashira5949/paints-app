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

async function seedSalesHistory() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        console.log('Fetching user and color data...');

        const userRes = await client.query('SELECT id FROM users LIMIT 1');
        if (userRes.rows.length === 0) throw new Error('No users found.');
        const userId = userRes.rows[0].id;

        const colorRes = await client.query('SELECT id, name FROM colors LIMIT 3');
        if (colorRes.rows.length === 0) throw new Error('No colors found.');

        console.log('Inserting Sales History Transactions...');

        const insertSale = async (colorId: number, packSize: number, quantityUnits: number, daysAgo: number, notes: string) => {
            const date = new Date();
            date.setDate(date.getDate() - daysAgo);
            
            await client.query(`
                INSERT INTO finished_stock_transactions 
                (color_id, pack_size_kg, quantity_units, quantity_kg, transaction_type, notes, created_by, created_at)
                VALUES ($1, $2, $3, $4, 'sale', $5, $6, $7)
            `, [colorId, packSize, -quantityUnits, -(packSize * quantityUnits), notes, userId, date]);
        };

        const color1 = colorRes.rows[0];
        const color2 = colorRes.rows.length > 1 ? colorRes.rows[1] : color1;
        const color3 = colorRes.rows.length > 2 ? colorRes.rows[2] : color1;

        // Sale 1
        await insertSale(color1.id, 20, 50, 5, 'Shipped to Asian Paints Ltd (Order #102)');
        
        // Sale 2
        await insertSale(color2.id, 5, 200, 3, 'Direct fulfill for local distributor');
        
        // Sale 3
        await insertSale(color3.id, 10, 30, 1, 'Sample batch sent to Berger Paints');

        // Sale 4
        await insertSale(color1.id, 20, 150, 10, 'Large order fulfillment (Order #098)');

        await client.query('COMMIT');
        console.log('Successfully seeded sales history!');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error seeding sales history:', err);
    } finally {
        client.release();
        process.exit(0);
    }
}

seedSalesHistory();
