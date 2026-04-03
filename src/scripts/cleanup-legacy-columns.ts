
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

async function cleanup() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL
    });

    try {
        await client.connect();
        console.log('--- Cleaning Up Legacy Columns ---');

        // Remove old columns from colors table
        const query = `
            ALTER TABLE colors 
            DROP COLUMN IF EXISTS available_lcs,
            DROP COLUMN IF EXISTS available_std,
            DROP COLUMN IF EXISTS available_opq_js,
            DROP COLUMN IF EXISTS product_type,
            DROP COLUMN IF EXISTS series;
        `;
        
        await client.query(query);
        console.log('Legacy columns removed successfully.');

    } catch (error) {
        console.error('Error during cleanup:', error);
    } finally {
        await client.end();
    }
}

cleanup();
