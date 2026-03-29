import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
async function runMigrate() {
  try {
    await pool.query("ALTER TABLE production_runs ADD COLUMN IF NOT EXISTS waste_kg DECIMAL(12, 4) DEFAULT 0;");
    console.log("Migration successful: Added waste_kg to production_runs");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}
runMigrate();
