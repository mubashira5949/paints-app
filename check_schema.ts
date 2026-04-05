const { Client } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function check() {
  try {
    await client.connect();
    const res = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'production_runs';");
    console.log("Columns in production_runs:");
    res.rows.forEach(r => console.log("- " + r.column_name));
    process.exit(0);
  } catch (err) {
    console.error("Failed to check schema:", err);
    process.exit(1);
  }
}
check();
