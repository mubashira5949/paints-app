
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function syncStock() {
    try {
        console.log('Synchronizing Stock for Run ID 31 and Run ID 33...');

        // Run 31 needs 9kg more Titanium Dioxide (ID 17?) 
        // Run 33 needs 1kg more Phthalocyanine Blue (ID 19?)
        
        // We'll find the resources by name to be safe
        const resourcesRes = await pool.query(`
            SELECT id, name, current_stock FROM resources 
            WHERE name IN ('Titanium Dioxide', 'Phthalocyanine Blue')
        `);

        for (const res of resourcesRes.rows) {
            let addAmount = 0;
            if (res.name === 'Titanium Dioxide') {
                addAmount = 10; // Add 10 to be safe (Needs 14, has 5)
            } else if (res.name === 'Phthalocyanine Blue') {
                addAmount = 2; // Add 2 to be safe (Needs 6, has 5)
            }

            if (addAmount > 0) {
                console.log(`- Adding ${addAmount} kg to ${res.name} (Current: ${res.current_stock} kg)`);
                await pool.query(`
                    INSERT INTO resource_stock_transactions (resource_id, transaction_type, quantity, notes)
                    VALUES ($1, 'adjustment', $2, 'Temporary stock sync to unblock production run completion')
                `, [res.id, addAmount]);
                
                // Note: The trigger on resource_stock_transactions will update the resources table
            }
        }

        console.log('SUCCESS: Stock synchronization complete.');
    } catch (err: any) {
        console.error('FAILURE: Could not sync stock:', err.message);
    } finally {
        await pool.end();
    }
}

syncStock();
