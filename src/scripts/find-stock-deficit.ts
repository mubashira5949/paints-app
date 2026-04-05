
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function findFailingRun() {
    try {
        const res = await pool.query(`
            SELECT pr.id, pr.planned_quantity_kg, pr.status, f.name as formula_name
            FROM production_runs pr
            JOIN formulas f ON pr.formula_id = f.id
            WHERE pr.status IN ('running', 'paused')
            ORDER BY pr.updated_at DESC
            LIMIT 5;
        `);
        console.log('Active/Recently Upated Runs:');
        for (const run of res.rows) {
            console.log(`- ID: ${run.id} | Status: ${run.status} | Target: ${run.planned_quantity_kg}kg | Formula: ${run.formula_name}`);
            
            // Check formula resources required
            const resources = await pool.query(`
                SELECT r.name, ra.actual_quantity_used, r.current_stock
                FROM production_resource_actuals ra
                JOIN resources r ON ra.resource_id = r.id
                WHERE ra.production_run_id = $1;
            `, [run.id]);
            
            for (const r of resources.rows) {
                const deficit = r.current_stock - r.actual_quantity_used;
                console.log(`  * ${r.name}: Needs ${r.actual_quantity_used} | Stock ${r.current_stock} | Diff: ${deficit.toFixed(2)} ${deficit < 0 ? '!!! DEFICIT !!!' : ''}`);
            }
        }
    } catch (err: any) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

findFailingRun();
