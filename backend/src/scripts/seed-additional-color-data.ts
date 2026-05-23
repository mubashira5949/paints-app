import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function seedAdditionalData() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Fetch all colors
        const colorsRes = await client.query('SELECT id, name FROM colors ORDER BY id ASC');
        const colors = colorsRes.rows;

        // Clear existing product types just in case
        await client.query('DELETE FROM color_product_types');

        let index = 1;
        for (const color of colors) {
            // Generate product code (e.g. INK-001)
            const productCode = `INK-${index.toString().padStart(3, '0')}`;
            // Generate HSN code (e.g. 3215 for printing ink, 3208 for paints)
            const hsnCode = index % 2 === 0 ? '3215' : '3208';

            // Update color
            await client.query(
                'UPDATE colors SET business_code = $1, hsn_code = $2 WHERE id = $3',
                [productCode, hsnCode, color.id]
            );

            // Assign product types
            // Roughly: 40% Water Based (1), 40% Oil Based (2), 20% Both (1, 2)
            const rand = Math.random();
            const typesToAssign: number[] = [];
            
            if (rand < 0.4) {
                typesToAssign.push(1); // Water Based
            } else if (rand < 0.8) {
                typesToAssign.push(2); // Oil Based
            } else {
                typesToAssign.push(1, 2); // Both
            }

            for (const typeId of typesToAssign) {
                await client.query(
                    'INSERT INTO color_product_types (color_id, type_id) VALUES ($1, $2)',
                    [color.id, typeId]
                );
            }

            index++;
        }

        await client.query('COMMIT');
        console.log('Successfully added Product Codes, HSN Codes, and assigned Product Types to all colors.');
        process.exit(0);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error seeding additional data:', err);
        process.exit(1);
    } finally {
        client.release();
    }
}

seedAdditionalData();
