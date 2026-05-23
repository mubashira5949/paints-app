import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const colorData = [
    { name: 'BLACK', lcs: true, std: true, opq: true },
    { name: 'LEMON YELLOW', lcs: true, std: true, opq: true },
    { name: 'GOLDEN YELLOW', lcs: true, std: true, opq: true },
    { name: 'BLUE ROYAL', lcs: true, std: true, opq: true },
    { name: 'BLUE NAVY', lcs: true, std: true, opq: true },
    { name: 'ALPHA GREEN', lcs: true, std: true, opq: true },
    { name: 'DALLAS GREEN', lcs: true, std: true, opq: true },
    { name: 'DMP', lcs: true, std: true, opq: true },
    { name: 'ORANGE', lcs: true, std: true, opq: true },
    { name: 'BRITE BLUE', lcs: true, std: true, opq: true },
    { name: 'SPICY BROWN', lcs: false, std: true, opq: true },
    { name: 'VIOLET', lcs: false, std: true, opq: true },
    { name: 'TEE BLUE', lcs: false, std: true, opq: true },
    { name: 'TURQUOISE', lcs: false, std: true, opq: true },
    { name: 'RED SUPER', lcs: false, std: true, opq: true },
    { name: 'RED SCARLET', lcs: false, std: true, opq: true },
    { name: 'KHAKI', lcs: false, std: false, opq: true },
    { name: 'RAMA GREEN', lcs: false, std: true, opq: false },
    { name: 'DARK SUPER RED', lcs: true, std: false, opq: false },
    { name: 'STEEL GREY', lcs: false, std: false, opq: true },
    { name: 'FLT YGT', lcs: false, std: false, opq: true },
    { name: 'FLT PINK', lcs: false, std: false, opq: true },
    { name: 'FLT GREEN', lcs: false, std: false, opq: true },
    { name: 'FLT ORANGE', lcs: false, std: false, opq: true },
    { name: 'FLT MAGENTA', lcs: false, std: false, opq: true },
    { name: 'FLT NEON', lcs: false, std: false, opq: true },
    { name: 'FLT GOLDEN YELLOW', lcs: false, std: false, opq: true },
    { name: 'BRITE GREEN', lcs: false, std: true, opq: false },
    { name: 'FOAN BUFF', lcs: false, std: false, opq: true },
    { name: 'SKY BLUE', lcs: false, std: true, opq: false },
];

async function seedColors() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // Fetch grade IDs
        const gradesRes = await client.query('SELECT id, name FROM ink_grades');
        const grades = gradesRes.rows.reduce((acc, row) => {
            acc[row.name] = row.id;
            return acc;
        }, {} as Record<string, number>);
        
        const lcsId = grades['LCS'];
        const stdId = grades['STD'];
        const opqId = grades['OPQ/JS'];
        
        if (!lcsId || !stdId || !opqId) {
            throw new Error('Missing ink grades in database. Please seed them first.');
        }

        for (const row of colorData) {
            // Check if color exists
            const existingRes = await client.query('SELECT id FROM colors WHERE name = $1', [row.name]);
            let colorId;
            if (existingRes.rows.length > 0) {
                colorId = existingRes.rows[0].id;
                console.log(`Color ${row.name} already exists. Updating its grades.`);
            } else {
                // Insert color
                const insertRes = await client.query(
                    'INSERT INTO colors (name, min_threshold_kg) VALUES ($1, 0) RETURNING id',
                    [row.name]
                );
                colorId = insertRes.rows[0].id;
            }
            
            // Clear existing grades for this color
            await client.query('DELETE FROM color_ink_grades WHERE color_id = $1', [colorId]);
            
            // Insert grades based on table
            if (row.lcs) await client.query('INSERT INTO color_ink_grades (color_id, grade_id) VALUES ($1, $2)', [colorId, lcsId]);
            if (row.std) await client.query('INSERT INTO color_ink_grades (color_id, grade_id) VALUES ($1, $2)', [colorId, stdId]);
            if (row.opq) await client.query('INSERT INTO color_ink_grades (color_id, grade_id) VALUES ($1, $2)', [colorId, opqId]);
        }

        await client.query('COMMIT');
        console.log('Successfully seeded all colors and their ink series.');
        process.exit(0);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error:', err);
        process.exit(1);
    } finally {
        client.release();
    }
}

seedColors();
