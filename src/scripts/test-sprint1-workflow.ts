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
                email: 'manager@paintsapp.com',
                password: 'managerpassword'
            })
        });

        if (!loginResponse.ok) {
            throw new Error(`Login failed: ${loginResponse.statusText}`);
        }

        const { token } = await loginResponse.json() as any;
        const authHeader = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
        console.log('✅ Login successful!');

        // 2. Prepare Test Data via SQL
        console.log('📊 Preparing test data...');

        // Clean up previous test data
        await pool.query("DELETE FROM recipe_resources WHERE recipe_id IN (SELECT id FROM recipes WHERE name = 'Test Recipe')");
        await pool.query("DELETE FROM recipes WHERE name = 'Test Recipe'");
        await pool.query("DELETE FROM colors WHERE name = 'Test Color'");
        await pool.query("DELETE FROM resources WHERE name = 'Test Pigment'");

        // Create Resource
        const resResult = await pool.query(
            "INSERT INTO resources (name, unit, current_stock) VALUES ('Test Pigment', 'kg', 0) RETURNING id"
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

        // Create Recipe
        const recipeResult = await pool.query(
            "INSERT INTO recipes (color_id, name, batch_size_liters) VALUES ($1, 'Test Recipe', 100) RETURNING id",
            [colorId]
        );
        const recipeId = recipeResult.rows[0].id;

        // Map Resource to Recipe (10kg for 100L)
        await pool.query(
            "INSERT INTO recipe_resources (recipe_id, resource_id, quantity_required) VALUES ($1, $2, 10)",
            [recipeId, resourceId]
        );

        console.log(`✅ Test data prepared: Resource=${resourceId}, Color=${colorId}, Recipe=${recipeId}`);

        // 3. Execute Production Run via API
        console.log('🏗️ Executing Production Run...');
        const productionResponse = await fetch(`${API_URL}/production-runs`, {
            method: 'POST',
            headers: authHeader,
            body: JSON.stringify({
                recipe_id: recipeId,
                planned_quantity_liters: 50, // Should use 5kg of pigment (50/100 * 10)
                actual_resources: [
                    { resource_id: resourceId, actual_quantity_used: 5 }
                ]
            })
        });

        if (!productionResponse.ok) {
            const error = await productionResponse.json() as any;
            throw new Error(`Production run failed: ${JSON.stringify(error)}`);
        }

        const { production_run_id } = await productionResponse.json() as any;
        console.log(`✅ Production run created: ID=${production_run_id}`);

        // 4. Verify Raw Stock Deduction
        console.log('🔍 Verifying raw stock deduction...');
        const stockResult = await pool.query("SELECT current_stock FROM resources WHERE id = $1", [resourceId]);
        const currentStock = parseFloat(stockResult.rows[0].current_stock);
        console.log(`Current stock: ${currentStock}kg (Expected: 95kg)`);

        if (currentStock !== 95) {
            throw new Error(`Stock deduction mismatch! Expected 95, got ${currentStock}`);
        }
        console.log('✅ Stock deduction verified!');

        // 5. Execute Packaging via API
        console.log('📦 Executing Packaging...');
        const packagingResponse = await fetch(`${API_URL}/production-runs/${production_run_id}/packaging`, {
            method: 'POST',
            headers: authHeader,
            body: JSON.stringify({
                packaging_details: [
                    { pack_size_liters: 5, quantity_units: 10 } // 50L total
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
        const inventoryResponse = await fetch(`${API_URL}/inventory/finished-stock`, {
            headers: authHeader
        });

        const inventory = await inventoryResponse.json() as any;
        const colorStock = inventory.data.find((c: any) => c.color_id === colorId);

        if (!colorStock) {
            throw new Error('Color not found in inventory!');
        }

        console.log(`Finished stock: ${colorStock.total_quantity_units} units, ${colorStock.total_volume_liters}L`);

        if (colorStock.total_quantity_units !== 10 || parseFloat(colorStock.total_volume_liters) !== 50) {
            throw new Error(`Finished stock mismatch! Expected 10 units/50L, got ${colorStock.total_quantity_units} units/${colorStock.total_volume_liters}L`);
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
