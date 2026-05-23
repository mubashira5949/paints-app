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

async function seedProductionRuns() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log('Fetching initial user and resources...');
        const userRes = await client.query('SELECT id FROM users LIMIT 1');
        if (userRes.rows.length === 0) throw new Error('No users found in database.');
        const userId = userRes.rows[0].id;

        const resourcesRes = await client.query('SELECT id, name FROM resources LIMIT 10');
        if (resourcesRes.rows.length === 0) throw new Error('No resources found. Run seed-raw-materials.ts first.');
        
        const resourceMap = new Map();
        for (const res of resourcesRes.rows) {
            resourceMap.set(res.name, res.id);
        }

        const titaniumId = resourceMap.get('Titanium Dioxide') || resourcesRes.rows[0].id;
        const resinId = resourceMap.get('Acrylic Resin') || resourcesRes.rows[1].id;
        const blueId = resourceMap.get('Phthalocyanine Blue') || resourcesRes.rows[2].id;

        console.log('Upserting Color and Formula...');
        // Insert Color
        let colorId;
        const existingColor = await client.query("SELECT id FROM colors WHERE name = 'Ocean Blue'");
        if (existingColor.rows.length > 0) {
            colorId = existingColor.rows[0].id;
        } else {
            const colorResult = await client.query(`
                INSERT INTO colors (name, color_code, business_code, description, min_threshold_kg)
                VALUES ('Ocean Blue', '#0077be', 'OB-100', 'Standard Ocean Blue', 500)
                RETURNING id
            `);
            colorId = colorResult.rows[0].id;
        }

        // Insert Formula
        let formulaId;
        const existingFormula = await client.query("SELECT id FROM formulas WHERE name = 'Ocean Blue Standard Recipe'");
        if (existingFormula.rows.length > 0) {
            formulaId = existingFormula.rows[0].id;
        } else {
            const formulaResult = await client.query(`
                INSERT INTO formulas (color_id, name, version, batch_size_kg, is_active)
                VALUES ($1, 'Ocean Blue Standard Recipe', 'v1.0', 100, true)
                RETURNING id
            `, [colorId]);
            formulaId = formulaResult.rows[0].id;
        }

        // Clear existing formula resources for this formula
        await client.query('DELETE FROM formula_resources WHERE formula_id = $1', [formulaId]);
        
        // Insert Formula Resources (100kg batch)
        await client.query(`INSERT INTO formula_resources (formula_id, resource_id, quantity_required) VALUES ($1, $2, $3)`, [formulaId, titaniumId, 15]);
        await client.query(`INSERT INTO formula_resources (formula_id, resource_id, quantity_required) VALUES ($1, $2, $3)`, [formulaId, resinId, 75]);
        await client.query(`INSERT INTO formula_resources (formula_id, resource_id, quantity_required) VALUES ($1, $2, $3)`, [formulaId, blueId, 10]);

        console.log('Inserting Production Runs...');
        
        // Helper to insert run
        const insertRun = async (status: string, planned: number, actual: number, dateOffsetDays: number) => {
            const date = new Date();
            date.setDate(date.getDate() - dateOffsetDays);
            
            const runRes = await client.query(`
                INSERT INTO production_runs (formula_id, planned_quantity_kg, actual_quantity_kg, status, created_by, created_at, started_at, completed_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING id
            `, [
                formulaId, 
                planned, 
                status === 'completed' || status === 'packaging' ? actual : null, 
                status, 
                userId,
                date,
                status !== 'planned' ? date : null,
                status === 'completed' || status === 'packaging' ? date : null
            ]);
            return runRes.rows[0].id;
        };

        // Run 1: Completed 2 days ago
        const run1Id = await insertRun('completed', 200, 198, 2);
        
        // Run 2: Completed 1 day ago
        const run2Id = await insertRun('completed', 100, 102, 1);
        
        // Run 3: Running today
        const run3Id = await insertRun('running', 300, 0, 0);

        console.log('Inserting Actuals and Stock Transactions...');

        // Helper to insert actuals
        const insertActuals = async (runId: number, multiplier: number, variancePercent: number) => {
            const reqs = [{ id: titaniumId, qty: 15 }, { id: resinId, qty: 75 }, { id: blueId, qty: 10 }];
            for (const r of reqs) {
                const expected = r.qty * multiplier;
                const actual = expected * (1 + variancePercent);
                await client.query(`
                    INSERT INTO production_resource_actuals (production_run_id, resource_id, expected_quantity, actual_quantity_used, variance)
                    VALUES ($1, $2, $3, $4, $5)
                `, [runId, r.id, expected, actual, actual - expected]);
            }
        };

        await insertActuals(run1Id, 2, 0.01); // 1% over-usage
        await insertActuals(run2Id, 1, -0.02); // 2% under-usage
        await insertActuals(run3Id, 3, 0); // No variance yet

        // Insert Stock Transactions for Completed Runs
        const insertPackaging = async (runId: number, totalKg: number) => {
            const buckets20kg = Math.floor(totalKg / 20);
            await client.query(`
                INSERT INTO finished_stock_transactions (color_id, pack_size_kg, quantity_units, quantity_kg, transaction_type, reference_id, created_by, created_at)
                VALUES ($1, $2, $3, $4, 'production_entry', $5, $6, NOW())
            `, [colorId, 20, buckets20kg, buckets20kg * 20, runId, userId]);
        };

        await insertPackaging(run1Id, 198);
        await insertPackaging(run2Id, 102);

        await client.query('COMMIT');
        console.log('Successfully seeded production data!');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error seeding production data:', err);
    } finally {
        client.release();
        process.exit(0);
    }
}

seedProductionRuns();
