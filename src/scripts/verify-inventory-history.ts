/**
 * Verification Script: Seed Transaction History
 * This script adds mock production and sale transactions to verify inventory history.
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function seed() {
    try {
        console.log('Seeding transaction history...');

        // Clear transactions for a clean state
        await pool.query('DELETE FROM finished_stock_transactions');

        // Get some colors
        const colorsResult = await pool.query('SELECT id, name FROM colors');
        const colors = colorsResult.rows;

        if (colors.length === 0) {
            console.log('No colors found. Please seed colors first.');
            process.exit(0);
        }

        for (const color of colors) {
            // Seed a production entry
            await pool.query(`
                INSERT INTO finished_stock_transactions 
                (color_id, pack_size_kg, transaction_type, quantity_units, quantity_kg, reference_id, created_at)
                VALUES ($1, 5.0, 'production_entry', 20, 100.0, 102, NOW() - INTERVAL '1 day')
            `, [color.id]);

            // Seed a sale for some colors
            if (color.name.toLowerCase().includes('red') || color.name.toLowerCase().includes('test')) {
                await pool.query(`
                    INSERT INTO finished_stock_transactions 
                    (color_id, pack_size_kg, transaction_type, quantity_units, quantity_kg, reference_id, created_at)
                    VALUES ($1, 5.0, 'sale', 5, 25.0, 501, NOW() - INTERVAL '2 hours')
                `, [color.id]);
            }
        }

        console.log('Transaction history seeded successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Seeding failed:', err);
        process.exit(1);
    }
}

seed();
