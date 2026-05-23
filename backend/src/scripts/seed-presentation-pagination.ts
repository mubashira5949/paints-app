import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function main() {
  console.log("Seeding data for presentation view limits...");
  try {
    // 1. Get a user
    const userRes = await pool.query("SELECT id FROM users LIMIT 1");
    if (userRes.rows.length === 0) throw new Error("No users found");
    const userId = userRes.rows[0].id;

    // 2. Get some formulas
    const formulasRes = await pool.query("SELECT id, color_id FROM formulas LIMIT 5");
    if (formulasRes.rows.length === 0) throw new Error("No formulas found");
    const formulas = formulasRes.rows;
    
    // 3. Ensure 6 Active Production Runs (status: 'running', 'paused', 'packaging', 'planned')
    const activeRes = await pool.query("SELECT COUNT(*) FROM production_runs WHERE status IN ('planned', 'running', 'paused', 'packaging')");
    let activeCount = parseInt(activeRes.rows[0].count);
    while (activeCount < 6) {
      const r = formulas[Math.floor(Math.random() * formulas.length)];
      await pool.query(`
        INSERT INTO production_runs (formula_id, status, planned_quantity_kg, created_by)
        VALUES ($1, 'running', $2, $3)
      `, [r.id, Math.floor(Math.random() * 200) + 100, userId]);
      activeCount++;
    }
    console.log(`Ensured at least 6 active production runs.`);

    // 4. Ensure 11 Production History Runs (status: 'completed', 'flagged')
    const histRes = await pool.query("SELECT COUNT(*) FROM production_runs WHERE status IN ('completed', 'flagged')");
    let histCount = parseInt(histRes.rows[0].count);
    while (histCount < 11) {
      const r = formulas[Math.floor(Math.random() * formulas.length)];
      const target = Math.floor(Math.random() * 200) + 100;
      const actual = target + (Math.random() * 10 - 5);
      await pool.query(`
        INSERT INTO production_runs (formula_id, status, planned_quantity_kg, actual_quantity_kg, created_by, created_at)
        VALUES ($1, 'completed', $2, $3, $4, NOW() - (random() * interval '30 days'))
      `, [r.id, target, actual, userId]);
      histCount++;
    }
    console.log(`Ensured at least 11 production history runs.`);

    // 5. Ensure 11 Inventory Items
    // Inventory is based on packaged stock for colors.
    // Let's get distinct colors from packaged_paints or just add random stock to different colors.
    const colorsRes = await pool.query("SELECT id FROM colors");
    const allColors = colorsRes.rows;
    
    const currInv = await pool.query("SELECT COUNT(DISTINCT color_id) FROM finished_stock");
    let invCount = parseInt(currInv.rows[0].count);

    if (invCount < 11 && allColors.length >= 11) {
      // Find colors that have no stock
      const missingStockRes = await pool.query(`
        SELECT id FROM colors 
        WHERE id NOT IN (SELECT color_id FROM finished_stock) 
        LIMIT $1
      `, [11 - invCount]);
      
      for (const color of missingStockRes.rows) {
        // Insert some standard packaging stock
        await pool.query(`
          INSERT INTO finished_stock (color_id, pack_size_kg, quantity_units)
          VALUES ($1, 20.0, $2)
        `, [color.id, Math.floor(Math.random() * 50) + 10]);
      }
    }
    console.log(`Ensured at least 11 colors in inventory.`);

    // 6. Ensure 4 Dashboard Alerts (Raw materials with low stock)
    const alertRes = await pool.query("SELECT COUNT(*) FROM resources WHERE current_stock <= reorder_level");
    let alertCount = parseInt(alertRes.rows[0].count);

    if (alertCount < 4) {
       // Update some healthy resources to trigger alerts
       await pool.query(`
         UPDATE resources 
         SET current_stock = reorder_level - 5 
         WHERE current_stock > reorder_level 
         AND id IN (
           SELECT id FROM resources 
           WHERE current_stock > reorder_level 
           LIMIT $1
         )
       `, [4 - alertCount]);
    }
    console.log(`Ensured at least 4 inventory threshold alerts.`);

  } catch(e) {
    console.error("Error seeding presentation pagination data:", e);
  } finally {
    await pool.end();
  }
}

main();
