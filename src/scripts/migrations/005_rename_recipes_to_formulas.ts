import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  try {
    console.log('Starting migration to rename recipes to formulas...');
    
    // Rename tables
    await pool.query('ALTER TABLE IF EXISTS recipes RENAME TO formulas;');
    await pool.query('ALTER TABLE IF EXISTS recipe_resources RENAME TO formula_resources;');

    // Rename columns conditionally by checking if they exist
    const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='formula_resources' and column_name='recipe_id'
    `);
    
    if (columnCheck.rows.length > 0) {
      await pool.query('ALTER TABLE formula_resources RENAME COLUMN recipe_id TO formula_id;');
    }
    
    const columnCheck2 = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='production_runs' and column_name='recipe_id'
    `);
    
    if (columnCheck2.rows.length > 0) {
      await pool.query('ALTER TABLE production_runs RENAME COLUMN recipe_id TO formula_id;');
    }

    await pool.query('ALTER INDEX IF EXISTS recipes_pkey RENAME TO formulas_pkey;');
    await pool.query('ALTER INDEX IF EXISTS recipe_resources_pkey RENAME TO formula_resources_pkey;');

    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

runMigration();
