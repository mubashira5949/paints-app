
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function main() {
    try {
        const res = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'production_runs'
            ORDER BY ordinal_position;
        `);
        console.log('Columns in production_runs:');
        res.rows.forEach(row => {
            console.log(` - ${row.column_name} (${row.data_type})`);
        });

        // Test an update
        console.log('\nTesting a mock update on an existing run (if any)...');
        const runRes = await pool.query('SELECT id FROM production_runs LIMIT 1');
        if (runRes.rows.length > 0) {
            const id = runRes.rows[0].id;
            try {
                await pool.query('BEGIN');
                await pool.query('UPDATE production_runs SET updated_at = NOW(), loss_reason = $1 WHERE id = $2', ['Test Reason', id]);
                console.log('SUCCESS: Was able to update loss_reason column.');
                await pool.query('ROLLBACK');
            } catch (updateErr: any) {
                console.error('FAILURE: Could not update loss_reason column:', updateErr.message);
            }
        } else {
            console.log('No runs found to test update.');
        }

    } catch (err: any) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

main();
