
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

async function mergeCategories() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL
    });

    try {
        await client.connect();
        
        // 1. Find the IDs for OPQ and JS
        const opqRes = await client.query("SELECT id FROM product_series_categories WHERE name = 'OPQ'");
        const jsRes = await client.query("SELECT id FROM product_series_categories WHERE name = 'JS'");
        
        const opqId = opqRes.rows[0]?.id;
        const jsId = jsRes.rows[0]?.id;

        if (!opqId && !jsId) {
           console.log("OPQ and JS not found. Checking if OPQ/JS already exists...");
           const checkMerged = await client.query("SELECT id FROM product_series_categories WHERE name = 'OPQ/JS'");
           if (checkMerged.rows.length === 0) {
               console.log("Creating OPQ/JS as it doesn't exist.");
               await client.query("INSERT INTO product_series_categories (name) VALUES ('OPQ/JS')");
           }
           return;
        }

        console.log(`--- Merging OPQ (ID: ${opqId}) and JS (ID: ${jsId}) into OPQ/JS ---`);

        // Transaction to ensure atomicity
        await client.query('BEGIN');

        // Create or get OPQ/JS
        const mergedName = 'OPQ/JS';
        let mergedId;
        const checkRes = await client.query("SELECT id FROM product_series_categories WHERE name = $1", [mergedName]);
        if (checkRes.rows.length > 0) {
            mergedId = checkRes.rows[0].id;
        } else {
            const insertRes = await client.query("INSERT INTO product_series_categories (name) VALUES ($1) RETURNING id", [mergedName]);
            mergedId = insertRes.rows[0].id;
        }

        // Update all related colors
        if (opqId) {
            await client.query(`
                INSERT INTO color_product_series (color_id, series_id)
                SELECT color_id, $1 FROM color_product_series WHERE series_id = $2
                ON CONFLICT (color_id, series_id) DO NOTHING
            `, [mergedId, opqId]);
            await client.query("DELETE FROM color_product_series WHERE series_id = $1", [opqId]);
            await client.query("DELETE FROM product_series_categories WHERE id = $1", [opqId]);
        }

        if (jsId) {
            await client.query(`
                INSERT INTO color_product_series (color_id, series_id)
                SELECT color_id, $1 FROM color_product_series WHERE series_id = $2
                ON CONFLICT (color_id, series_id) DO NOTHING
            `, [mergedId, jsId]);
            await client.query("DELETE FROM color_product_series WHERE series_id = $1", [jsId]);
            await client.query("DELETE FROM product_series_categories WHERE id = $1", [jsId]);
        }

        await client.query('COMMIT');
        console.log("Merge completed successfully.");

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error during merge:', error);
    } finally {
        await client.end();
    }
}

mergeCategories();
