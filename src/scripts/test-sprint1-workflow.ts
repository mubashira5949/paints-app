import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const API_URL = `http://localhost:${process.env.PORT || 3000}`;

async function runTest() {
    console.log('🚀 Starting Sprint 1 Workflow Test...');

    try {
        // 1. Login as manager
        console.log('🔑 Logging in as manager...');
        const loginResponse = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                identifier: 'manager@paintsapp.com',
                password: 'managerpassword'
            })
        });

        if (!loginResponse.ok) {
            const errBody = await loginResponse.json() as any;
            throw new Error(`Login failed: ${loginResponse.statusText} - ${JSON.stringify(errBody)}`);
        }

        const { token } = await loginResponse.json() as any;
        const authHeader = { 
            'Authorization': `Bearer ${token}`, 
            'Content-Type': 'application/json' 
        };
        console.log('✅ Login successful!');

        // 2. Prepare Test Data via SQL
        console.log('📊 Preparing test data...');

        // Clean up previous test data
        await pool.query("DELETE FROM production_resource_actuals WHERE production_run_id IN (SELECT id FROM production_runs WHERE formula_id IN (SELECT id FROM formulas WHERE name = 'Test Formula'))");
        await pool.query("DELETE FROM finished_stock_transactions WHERE color_id IN (SELECT id FROM colors WHERE name = 'Test Color')");
        await pool.query("DELETE FROM finished_stock WHERE color_id IN (SELECT id FROM colors WHERE name = 'Test Color')");
        await pool.query("DELETE FROM production_runs WHERE formula_id IN (SELECT id FROM formulas WHERE name = 'Test Formula')");
        await pool.query("DELETE FROM formula_resources WHERE formula_id IN (SELECT id FROM formulas WHERE name = 'Test Formula')");
        await pool.query("DELETE FROM formulas WHERE name = 'Test Formula'");
        await pool.query("DELETE FROM colors WHERE name = 'Test Color'");
        await pool.query("DELETE FROM resource_stock_transactions WHERE resource_id IN (SELECT id FROM resources WHERE name = 'Test Pigment')");
        await pool.query("DELETE FROM resources WHERE name = 'Test Pigment'");

        // Create Resource
        const resResult = await pool.query(
            "INSERT INTO resources (name, unit, current_stock, reorder_level) VALUES ('Test Pigment', 'kg', 0, 10) RETURNING id"
        );
        const resourceId = resResult.rows[0].id;

        // Add initial stock via transaction
        await pool.query(
            "INSERT INTO resource_stock_transactions (resource_id, transaction_type, quantity, notes) VALUES ($1, 'purchase', 100, 'Initial test stock')",
            [resourceId]
        );

        // Create Color
        const colorResult = await pool.query(
            "INSERT INTO colors (name, color_code) VALUES ('Test Color', '#FF5733') RETURNING id"
        );
        const colorId = colorResult.rows[0].id;

        // Create Formula
        const formulaResult = await pool.query(
            "INSERT INTO formulas (color_id, name, batch_size_kg) VALUES ($1, 'Test Formula', 100) RETURNING id",
            [colorId]
        );
        const formulaId = formulaResult.rows[0].id;

        // Map Resource to Formula (10kg for 100kg batch)
        await pool.query(
            "INSERT INTO formula_resources (formula_id, resource_id, quantity_required) VALUES ($1, $2, 10)",
            [formulaId, resourceId]
        );

        console.log(`✅ Test data prepared: Resource=${resourceId}, Color=${colorId}, Formula=${formulaId}`);

        // 3. Execute Production Run
        console.log('🏗️ Executing Production Run...');
        const productionResponse = await fetch(`${API_URL}/production-runs`, {
            method: 'POST',
            headers: authHeader,
            body: JSON.stringify({
                formulaId: formulaId,
                expectedOutput: 50, // 50kg batch
                actualResources: [
                    { resourceId: resourceId, quantity: 5 } // Using 5kg (exact match for 50/100 scale)
                ]
            })
        });

        if (!productionResponse.ok) {
            const error = await productionResponse.json() as any;
            throw new Error(`Production run failed: ${JSON.stringify(error)}`);
        }

        const prodResult = await productionResponse.json() as any;
        const productionRunId = prodResult.id || prodResult.production_run_id;
        console.log(`✅ Production run created: ID=${productionRunId}`);

        // 4. Verify Raw Stock Deduction
        console.log('🔍 Verifying raw stock deduction...');
        const stockResult = await pool.query("SELECT current_stock FROM resources WHERE id = $1", [resourceId]);
        const currentStock = parseFloat(stockResult.rows[0].current_stock);
        console.log(`Current stock: ${currentStock}kg (Expected: 95kg)`);

        if (currentStock !== 95) {
            throw new Error(`Stock deduction mismatch! Expected 95, got ${currentStock}`);
        }
        console.log('✅ Stock deduction verified!');

        // 5. Execute Packaging
        console.log('📦 Executing Packaging...');
        const packagingResponse = await fetch(`${API_URL}/production-runs/${productionRunId}/packaging`, {
            method: 'POST',
            headers: authHeader,
            body: JSON.stringify({
                packaging_details: [
                    { pack_size_kg: 5, quantity_units: 10 } // 50kg total
                ]
            })
        });

        if (!packagingResponse.ok) {
            const error = await packagingResponse.json() as any;
            throw new Error(`Packaging failed: ${JSON.stringify(error)}`);
        }
        console.log('✅ Packaging completed!');

        // 6. Verify Finished Stock
        console.log('🔍 Verifying finished stock...');
        const inventoryResponse = await fetch(`${API_URL}/api/inventory`, {
            headers: authHeader
        });

        const inventory = await inventoryResponse.json() as any;
        // The inventory likely returns an array now, based on my previous edits
        const colorStock = Array.isArray(inventory) ? inventory.find((c: any) => c.id === colorId) : inventory.data?.find((c: any) => c.id === colorId);

        if (!colorStock) {
            throw new Error('Color not found in inventory!');
        }

        console.log(`Finished stock: ${colorStock.units} units, ${colorStock.mass}kg`);

        if (Number(colorStock.units) !== 10 || Number(colorStock.mass) !== 50) {
            throw new Error(`Finished stock mismatch! Expected 10 units/50kg, got ${colorStock.units} units/${colorStock.mass}kg`);
        }
        console.log('✅ Finished stock verified!');

        console.log('✨ Sprint 1 Workflow Test PASSED! ✨');

    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runTest();
