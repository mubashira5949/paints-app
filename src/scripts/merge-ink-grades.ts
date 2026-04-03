
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

async function run() {
  console.log('Connecting...');
  await client.connect();
  console.log('Connected.');
  try {
    await client.query('BEGIN');
    
    // 1. Get or Create OPQ/JS in ink_grades
    let mergedId;
    const checkRes = await client.query("SELECT id FROM ink_grades WHERE name = 'OPQ/JS'");
    if (checkRes.rows.length === 0) {
      const insertRes = await client.query("INSERT INTO ink_grades (name) VALUES ('OPQ/JS') RETURNING id");
      mergedId = insertRes.rows[0].id;
    } else {
      mergedId = checkRes.rows[0].id;
    }

    // 2. Find OPQ and JS IDs
    const oldIdsRes = await client.query("SELECT id FROM ink_grades WHERE name IN ('OPQ', 'JS')");
    const oldIds = oldIdsRes.rows.map(r => r.id);

    for (const oldId of oldIds) {
      console.log(`Merging ID: ${oldId} into ${mergedId}`);
      // Remove any existing duplicate links for the colors that already have mergedId
      await client.query("DELETE FROM color_ink_grades WHERE grade_id = $1 AND color_id IN (SELECT color_id FROM color_ink_grades WHERE grade_id = $2)", [oldId, mergedId]);
      // Update remaining links from oldId to mergedId
      await client.query("UPDATE color_ink_grades SET grade_id = $1 WHERE grade_id = $2", [mergedId, oldId]);
      // Remove old category record
      await client.query("DELETE FROM ink_grades WHERE id = $1", [oldId]);
    }

    await client.query('COMMIT');
    console.log('MERGE SUCCESSFUL');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('ERROR:', e);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
