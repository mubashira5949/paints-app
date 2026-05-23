import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const suppliers = [
    { name: 'ChemCorp Inc.', contact_person: 'Alice Smith', email: 'alice@chemcorp.com', phone: '555-0101', address: '123 Chemical Blvd' },
    { name: 'Global Pigments Ltd.', contact_person: 'Bob Jones', email: 'bob@globalpigments.com', phone: '555-0102', address: '456 Color Way' },
    { name: 'Solvent Solutions', contact_person: 'Charlie Brown', email: 'charlie@solventsolutions.com', phone: '555-0103', address: '789 Liquid Lane' },
];

const rawMaterials = [
    { name: 'Titanium Dioxide', description: 'White pigment', unit: 'kg', current_stock: 500, reorder_level: 200, supplierIndex: 1, color: 'White', feel: 'Powder' },
    { name: 'Carbon Black', description: 'Black pigment', unit: 'kg', current_stock: 50, reorder_level: 100, supplierIndex: 1, color: 'Black', feel: 'Powder' }, // Low stock
    { name: 'Acrylic Resin', description: 'Primary binder', unit: 'kg', current_stock: 1200, reorder_level: 500, supplierIndex: 0, color: 'Clear', feel: 'Viscous Liquid' },
    { name: 'Polyurethane Dispersion', description: 'Secondary binder', unit: 'kg', current_stock: 150, reorder_level: 300, supplierIndex: 0, color: 'Milky White', feel: 'Liquid' }, // Low stock
    { name: 'Toluene', description: 'Fast evaporating solvent', unit: 'L', current_stock: 800, reorder_level: 400, supplierIndex: 2, color: 'Clear', feel: 'Liquid' },
    { name: 'Xylene', description: 'Medium evaporating solvent', unit: 'L', current_stock: 350, reorder_level: 400, supplierIndex: 2, color: 'Clear', feel: 'Liquid' }, // Low stock
    { name: 'Phthalocyanine Blue', description: 'Blue pigment', unit: 'kg', current_stock: 300, reorder_level: 150, supplierIndex: 1, color: 'Blue', feel: 'Powder' },
    { name: 'Calcium Carbonate', description: 'Extender/Filler', unit: 'kg', current_stock: 2000, reorder_level: 1000, supplierIndex: 0, color: 'White', feel: 'Powder' },
    { name: 'Defoamer PD-20', description: 'Bubble prevention', unit: 'kg', current_stock: 25, reorder_level: 50, supplierIndex: 0, color: 'Yellowish', feel: 'Liquid' }, // Low stock
    { name: 'Anti-settling Agent', description: 'Prevents pigment settling', unit: 'kg', current_stock: 10, reorder_level: 20, supplierIndex: 2, color: 'Clear', feel: 'Gel' } // Low stock
];

async function seedRawMaterials() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log('Seeding suppliers...');
        const supplierIds: number[] = [];
        for (const supplier of suppliers) {
            const result = await client.query(
                `INSERT INTO suppliers (name, contact_person, email, phone, address) 
                 VALUES ($1, $2, $3, $4, $5) 
                 ON CONFLICT (name) DO UPDATE SET 
                    contact_person = EXCLUDED.contact_person,
                    email = EXCLUDED.email,
                    phone = EXCLUDED.phone,
                    address = EXCLUDED.address
                 RETURNING id`,
                [supplier.name, supplier.contact_person, supplier.email, supplier.phone, supplier.address]
            );
            supplierIds.push(result.rows[0].id);
        }

        console.log('Seeding raw materials...');
        for (const rm of rawMaterials) {
            const supplierId = supplierIds[rm.supplierIndex];
            await client.query(
                `INSERT INTO resources (name, description, unit, current_stock, reorder_level, supplier_id, color, feel)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                 ON CONFLICT (name) DO UPDATE SET
                    description = EXCLUDED.description,
                    unit = EXCLUDED.unit,
                    current_stock = EXCLUDED.current_stock,
                    reorder_level = EXCLUDED.reorder_level,
                    supplier_id = EXCLUDED.supplier_id,
                    color = EXCLUDED.color,
                    feel = EXCLUDED.feel`,
                [rm.name, rm.description, rm.unit, rm.current_stock, rm.reorder_level, supplierId, rm.color, rm.feel]
            );
        }

        await client.query('COMMIT');
        console.log('Successfully seeded 3 suppliers and 10 raw materials.');
        process.exit(0);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error seeding raw materials:', err);
        process.exit(1);
    } finally {
        client.release();
    }
}

seedRawMaterials();
