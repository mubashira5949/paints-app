import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();
import fs from 'fs';
import path from 'path';

let sslOptions: any = { rejectUnauthorized: false };
if (process.env.DB_SSL_ROOT_CERT) {
    sslOptions = {
        rejectUnauthorized: true,
        ca: fs.readFileSync(path.resolve(process.env.DB_SSL_ROOT_CERT)).toString()
    };
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: sslOptions
});

async function check() {
    try {
        const res = await pool.query("SELECT name, color_code FROM colors LIMIT 1;");
        console.log("Database connection successful. Sample data:");
        console.log(JSON.stringify(res.rows[0], null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
check();
