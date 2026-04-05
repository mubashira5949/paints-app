
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function checkStock() {
    try {
        // Find the last incomplete/running production run or the one from the screenshot
        // The screenshot shows a 70kg target, 10kg actual, 60kg loss, spillage, machine failure.
        // Let's find the current running/paused runs.
        const runs = await pool.query(`
            SELECT id, batchId, formula_id, planned_quantity_kg 
            FROM production_runs 
            WHERE status IN ('running', 'paused') 
            ORDER BY created_at DESC LIMIT 5
        `);
        
        for (const run of runs.rows) {
            console.log(`Checking Stock for Run: ${run.batchid} (Target: ${run.planned_quantity_kg}kg)`);
            const actuals = await pool.query(`
                SELECT ra.resource_id, r.name, ra.actual_quantity_used, r.current_stock
                FROM production_resource_actuals ra
                JOIN resources r ON ra.resource_id = r.id
                WHERE ra.production_run_id = $1
            `, [run.id]);
            
            if (actuals.rows.length === 0) {
                console.log(' - No actuals logged yet. Deduction would be based on formula.');
            } else {
                actuals.rows.forEach(a => {
                    const diff = a.current_stock - a.actual_quantity_used;
                    console.log(` - ${a.name}: Usage ${a.actual_quantity_used} | Stock ${a.current_stock} | Remaining ${diff.toFixed(2)} ${diff < 0 ? '!!! NEGATIVE !!!' : ''}`);
                });
            }
        }
    } catch (err: any) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

checkStock();
