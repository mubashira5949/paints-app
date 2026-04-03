/**
 * Seed Script: Insert all standard colors with ink series availability + placeholder codes.
 * Run with: npx tsx src/scripts/seed-colors.ts
 * Uses INSERT ... ON CONFLICT (name) DO UPDATE — safe to re-run.
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { 
        rejectUnauthorized: false,
        servername: 'db.neon.tech'
    }
});

interface ColorSeed {
    name: string;
    series: string;
    product_type: 'Water Based' | 'Oil Based';
    available_lcs: boolean;
    available_std: boolean;
    available_opq_js: boolean;
    hsn_code: string;
    business_code: string;
}

// ─── Shared HSN / product codes ─────────────────────────────────────────────
const INK_HSN = '32081090';
const HD_HSN  = '32089090';

// ─── Ink Series colours (1-30) ──────────────────────────────────────────────
// Categorized as 'Oil Based' by default for the core ink series.
const INK_COLORS: ColorSeed[] = [
    // name                  | series       | type        | ink_series | lcs   | std   | js    | hsn       | code
    { name: 'BLACK',            series: 'Ink Series', product_type: 'Oil Based',      available_lcs: true,  available_std: true,  available_opq_js: true,  hsn_code: INK_HSN, business_code: 'INK-001' },
    { name: 'LEMON YELLOW',     series: 'Ink Series', product_type: 'Oil Based',      available_lcs: true,  available_std: true,  available_opq_js: true,  hsn_code: INK_HSN, business_code: 'INK-002' },
    { name: 'GOLDEN YELLOW',    series: 'Ink Series', product_type: 'Oil Based',      available_lcs: true,  available_std: true,  available_opq_js: true,  hsn_code: INK_HSN, business_code: 'INK-003' },
    { name: 'BLUE ROYAL',       series: 'Ink Series', product_type: 'Oil Based',      available_lcs: true,  available_std: true,  available_opq_js: true,  hsn_code: INK_HSN, business_code: 'INK-004' },
    { name: 'BLUE NAVY',        series: 'Ink Series', product_type: 'Oil Based',      available_lcs: true,  available_std: true,  available_opq_js: true,  hsn_code: INK_HSN, business_code: 'INK-005' },
    { name: 'ALPHA GREEN',      series: 'Ink Series', product_type: 'Oil Based',      available_lcs: true,  available_std: true,  available_opq_js: true,  hsn_code: INK_HSN, business_code: 'INK-006' },
    { name: 'DALLAS GREEN',     series: 'Ink Series', product_type: 'Oil Based',      available_lcs: true,  available_std: true,  available_opq_js: true,  hsn_code: INK_HSN, business_code: 'INK-007' },
    { name: 'DMP',              series: 'Ink Series', product_type: 'Oil Based',      available_lcs: true,  available_std: true,  available_opq_js: true,  hsn_code: INK_HSN, business_code: 'INK-008' },
    { name: 'ORANGE',           series: 'Ink Series', product_type: 'Oil Based',      available_lcs: true,  available_std: true,  available_opq_js: true,  hsn_code: INK_HSN, business_code: 'INK-009' },
    { name: 'BRITE BLUE',       series: 'Ink Series', product_type: 'Oil Based',      available_lcs: true,  available_std: true,  available_opq_js: true,  hsn_code: INK_HSN, business_code: 'INK-010' },
    { name: 'SPICY BROWN',      series: 'Ink Series', product_type: 'Oil Based',      available_lcs: false, available_std: true,  available_opq_js: true,  hsn_code: INK_HSN, business_code: 'INK-011' },
    { name: 'VIOLET',           series: 'Ink Series', product_type: 'Oil Based',      available_lcs: false, available_std: true,  available_opq_js: true,  hsn_code: INK_HSN, business_code: 'INK-012' },
    { name: 'TEE BLUE',         series: 'Ink Series', product_type: 'Oil Based',      available_lcs: false, available_std: true,  available_opq_js: true,  hsn_code: INK_HSN, business_code: 'INK-013' },
    { name: 'TURQUOISE',        series: 'Ink Series', product_type: 'Oil Based',      available_lcs: false, available_std: true,  available_opq_js: true,  hsn_code: INK_HSN, business_code: 'INK-014' },
    { name: 'RED SUPER',        series: 'Ink Series', product_type: 'Oil Based',      available_lcs: false, available_std: true,  available_opq_js: true,  hsn_code: INK_HSN, business_code: 'INK-015' },
    { name: 'RED SCARLET',      series: 'Ink Series', product_type: 'Oil Based',      available_lcs: false, available_std: true,  available_opq_js: true,  hsn_code: INK_HSN, business_code: 'INK-016' },
    { name: 'KHAKI',            series: 'Ink Series', product_type: 'Oil Based',      available_lcs: false, available_std: false, available_opq_js: true,  hsn_code: INK_HSN, business_code: 'INK-017' },
    { name: 'RAMA GREEN',       series: 'Ink Series', product_type: 'Oil Based',      available_lcs: false, available_std: true,  available_opq_js: false, hsn_code: INK_HSN, business_code: 'INK-018' },
    { name: 'DARK SUPER RED',   series: 'Ink Series', product_type: 'Oil Based',      available_lcs: true,  available_std: false, available_opq_js: false, hsn_code: INK_HSN, business_code: 'INK-019' },
    { name: 'STEEL GREY',       series: 'Ink Series', product_type: 'Oil Based',      available_lcs: false, available_std: false, available_opq_js: true,  hsn_code: INK_HSN, business_code: 'INK-020' },
    { name: 'FLT YGT',          series: 'Ink Series', product_type: 'Oil Based',      available_lcs: false, available_std: false, available_opq_js: true,  hsn_code: INK_HSN, business_code: 'INK-021' },
    { name: 'FLT PINK',         series: 'Ink Series', product_type: 'Oil Based',      available_lcs: false, available_std: false, available_opq_js: true,  hsn_code: INK_HSN, business_code: 'INK-022' },
    { name: 'FLT GREEN',        series: 'Ink Series', product_type: 'Oil Based',      available_lcs: false, available_std: false, available_opq_js: true,  hsn_code: INK_HSN, business_code: 'INK-023' },
    { name: 'FLT ORANGE',       series: 'Ink Series', product_type: 'Oil Based',      available_lcs: false, available_std: false, available_opq_js: true,  hsn_code: INK_HSN, business_code: 'INK-024' },
    { name: 'FLT MAGENTA',      series: 'Ink Series', product_type: 'Oil Based',      available_lcs: false, available_std: false, available_opq_js: true,  hsn_code: INK_HSN, business_code: 'INK-025' },
    { name: 'FLT NEON',         series: 'Ink Series', product_type: 'Oil Based',      available_lcs: false, available_std: false, available_opq_js: true,  hsn_code: INK_HSN, business_code: 'INK-026' },
    { name: 'FLT GOLDEN YELLOW',series: 'Ink Series', product_type: 'Oil Based',      available_lcs: false, available_std: false, available_opq_js: true,  hsn_code: INK_HSN, business_code: 'INK-027' },
    { name: 'BRITE GREEN',       series: 'Ink Series', product_type: 'Oil Based',      available_lcs: false, available_std: true,  available_opq_js: false, hsn_code: INK_HSN, business_code: 'INK-028' },
    { name: 'FOAN BUFF',        series: 'Ink Series', product_type: 'Oil Based',      available_lcs: false, available_std: false, available_opq_js: true,  hsn_code: INK_HSN, business_code: 'INK-029' },
    { name: 'SKY BLUE',         series: 'Ink Series', product_type: 'Oil Based',      available_lcs: false, available_std: true,  available_opq_js: false, hsn_code: INK_HSN, business_code: 'INK-030' },
];

// ─── High Density / Special / Water Based colours (31-42) ───────────────────
const HD_COLORS: ColorSeed[] = [
    { name: 'NEW HD',          series: 'High Density', product_type: 'Water Based', available_lcs: false, available_std: false, available_opq_js: false, hsn_code: HD_HSN, business_code: 'HD-001' },
    { name: 'NEW PUFF',        series: 'High Density', product_type: 'Water Based', available_lcs: false, available_std: false, available_opq_js: false, hsn_code: HD_HSN, business_code: 'HD-002' },
    { name: 'PUFF ADDITIVE',   series: 'High Density', product_type: 'Water Based', available_lcs: false, available_std: false, available_opq_js: false, hsn_code: HD_HSN, business_code: 'HD-003' },
    { name: 'NEW EMBOSS GELL', series: 'High Density', product_type: 'Water Based', available_lcs: false, available_std: false, available_opq_js: false, hsn_code: HD_HSN, business_code: 'HD-004' },
    { name: 'CLEAR GELL 505',  series: 'High Density', product_type: 'Water Based', available_lcs: false, available_std: false, available_opq_js: false, hsn_code: HD_HSN, business_code: 'HD-005' },
    { name: 'WHITE G-S',       series: 'High Density', product_type: 'Oil Based',   available_lcs: false, available_std: false, available_opq_js: false, hsn_code: HD_HSN, business_code: 'HD-006' },
    { name: 'WHITE S-S',       series: 'High Density', product_type: 'Oil Based',   available_lcs: false, available_std: false, available_opq_js: false, hsn_code: HD_HSN, business_code: 'HD-007' },
    { name: 'SUPER WHITE',     series: 'High Density', product_type: 'Oil Based',   available_lcs: false, available_std: false, available_opq_js: false, hsn_code: HD_HSN, business_code: 'HD-008' },
    { name: 'CD 300 WHITE',    series: 'High Density', product_type: 'Water Based', available_lcs: false, available_std: false, available_opq_js: false, hsn_code: HD_HSN, business_code: 'HD-009' },
    { name: 'POLAR WHITE',     series: 'High Density', product_type: 'Water Based', available_lcs: false, available_std: false, available_opq_js: false, hsn_code: HD_HSN, business_code: 'HD-010' },
    { name: '1 STROKE WHITE',  series: 'High Density', product_type: 'Water Based', available_lcs: false, available_std: false, available_opq_js: false, hsn_code: HD_HSN, business_code: 'HD-011' },
];

const ALL_COLORS = [...INK_COLORS, ...HD_COLORS];

async function seed() {
    const client = await pool.connect();
    try {
        console.log(`Seeding ${ALL_COLORS.length} colors...`);
        let inserted = 0;
        let updated = 0;

        for (const color of ALL_COLORS) {
            const result = await client.query(
                `INSERT INTO colors
                   (name, series, product_type, available_lcs, available_std, available_opq_js,
                    hsn_code, business_code, color_code, tags)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, '#888888', '[]')
                 ON CONFLICT (name) DO UPDATE SET
                   series           = EXCLUDED.series,
                   product_type     = EXCLUDED.product_type,
                   available_lcs    = EXCLUDED.available_lcs,
                   available_std    = EXCLUDED.available_std,
                   available_opq_js = EXCLUDED.available_opq_js,
                   hsn_code         = EXCLUDED.hsn_code,
                   business_code    = EXCLUDED.business_code,
                   updated_at       = CURRENT_TIMESTAMP
                 RETURNING (xmax = 0) AS inserted`,
                [
                    color.name, color.series, JSON.stringify([color.product_type]), 
                    color.available_lcs, color.available_std, color.available_opq_js,
                    color.hsn_code, color.business_code
                ]
            );
            if (result.rows[0]?.inserted) inserted++; else updated++;
        }

        console.log(`Done! Inserted: ${inserted}, Updated: ${updated}`);
        process.exit(0);
    } catch (err) {
        console.error('Seed failed:', err);
        process.exit(1);
    } finally {
        client.release();
    }
}

seed();

