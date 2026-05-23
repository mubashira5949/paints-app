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

async function main() {
    const client = await pool.connect();
    try {
        const schema = await client.query(`
            SELECT table_name, column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name IN ('orders', 'order_items', 'clients')
        `);
        console.log(JSON.stringify(schema.rows, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        client.release();
        process.exit(0);
    }
}

main();
