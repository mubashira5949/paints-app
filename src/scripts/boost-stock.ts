
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function boostStock() {
    try {
        console.log('Boosting stock levels to unblock all production runs...');
        
        // Let's boost common materials by 500kg
        const materials = ['Titanium Dioxide', 'Solvent X', 'Phthalocyanine Blue', 'White Pigment Base'];
        
        const resourcesRes = await pool.query(`
            SELECT id, name FROM resources 
            WHERE name = ANY($1)
        `, [materials]);

        for (const res of resourcesRes.rows) {
            console.log(`- Boosting ${res.name} by 500 kg...`);
            await pool.query(`
                INSERT INTO resource_stock_transactions (resource_id, transaction_type, quantity, notes)
                VALUES ($1, 'adjustment', 500, 'Bulk boost to unblock evaluation runs')
            `, [res.id]);
        }

        console.log('SUCCESS: Stock levels boosted.');
    } catch (err: any) {
        console.error('FAILURE:', err.message);
    } finally {
        await pool.end();
    }
}

boostStock();
