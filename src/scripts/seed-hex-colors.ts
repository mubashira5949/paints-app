import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const hexMap: Record<string, string> = {
    'BLACK': '#000000',
    'LEMON YELLOW': '#FAFA33',
    'GOLDEN YELLOW': '#FFC000',
    'BLUE ROYAL': '#4169E1',
    'BLUE NAVY': '#000080',
    'ALPHA GREEN': '#005000',
    'DALLAS GREEN': '#00A36C',
    'DMP': '#8A2BE2', // arbitrarily chosen purple
    'ORANGE': '#FFA500',
    'BRITE BLUE': '#0096FF',
    'SPICY BROWN': '#8B4513',
    'VIOLET': '#8F00FF',
    'TEE BLUE': '#4682B4',
    'TURQUOISE': '#40E0D0',
    'RED SUPER': '#FF0000',
    'RED SCARLET': '#FF2400',
    'KHAKI': '#F0E68C',
    'RAMA GREEN': '#00693E',
    'DARK SUPER RED': '#8B0000',
    'STEEL GREY': '#71797E',
    'FLT YGT': '#CCFF00', // fluorescent yellow green
    'FLT PINK': '#FF1493', // fluorescent pink
    'FLT GREEN': '#39FF14', // fluorescent green
    'FLT ORANGE': '#FF5F1F', // fluorescent orange
    'FLT MAGENTA': '#FF00FF', // fluorescent magenta
    'FLT NEON': '#DFFF00', // neon yellow
    'FLT GOLDEN YELLOW': '#FFD700',
    'BRITE GREEN': '#00FF00',
    'FOAN BUFF': '#F0DC82',
    'SKY BLUE': '#87CEEB'
};

async function seedHexColors() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        for (const [name, hex] of Object.entries(hexMap)) {
            await client.query(
                'UPDATE colors SET color_code = $1 WHERE name = $2',
                [hex, name]
            );
        }

        await client.query('COMMIT');
        console.log('Successfully added HEX color codes to all colors.');
        process.exit(0);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error seeding hex colors:', err);
        process.exit(1);
    } finally {
        client.release();
    }
}

seedHexColors();
