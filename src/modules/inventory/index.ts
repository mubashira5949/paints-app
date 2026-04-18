/**
 * Inventory Module
 * Handles retrieving current stock summaries for finished paint products.
 */

import { FastifyInstance } from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'
import { authorizeRole } from '../../utils/authorizeRole'

export default async function (fastifyRaw: FastifyInstance) {
    const fastify = fastifyRaw.withTypeProvider<TypeBoxTypeProvider>()

    /**
     * GET /inventory/finished-stock
     * Retrieves a summarized view of finished stock grouped by color and pack size.
     * Accessible by 'admin', 'manager', 'sales', and 'client'.
     */
    fastify.get('/finished-stock', {
        preHandler: [fastify.authenticate, authorizeRole(['admin', 'manager', 'sales', 'client'])],
        schema: {
            querystring: Type.Object({
                threshold: Type.Optional(Type.Number())
            })
        },
        handler: async (request, reply) => {
            const threshold = (request.query as any)?.threshold;
            let client
            try {
                // Retrieve a connection from the database pool
                client = await fastify.db.connect()

                // SQL Query to summarize finished stock:
                // - Groups rows by color properties (id, name, block code)
                // - Aggregates the total quantity of units across all pack sizes
                // - Calculates the total mass in kg (quantity * pack_size)
                // - Uses json_agg to nest the individual pack sizes into a 'packs' JSON array
                const query = `
                    WITH inventory_summary AS (
                        SELECT 
                            c.id AS color_id,
                            c.name AS color_name,
                            c.color_code,
                            c.business_code,
                            c.hsn_code,
                            c.tags,
                            ${threshold !== undefined ? `${threshold}::numeric` : 'c.min_threshold_kg'} AS active_threshold,
                            COALESCE(SUM(fs.quantity_units), 0)::integer AS total_quantity_units,
                            COALESCE(SUM(fs.quantity_units * fs.pack_size_kg), 0)::numeric AS total_mass_kg,
                            json_agg(
                                json_build_object(
                                    'pack_size_kg', fs.pack_size_kg,
                                    'quantity_units', fs.quantity_units
                                ) ORDER BY fs.pack_size_kg ASC
                            ) FILTER (WHERE fs.quantity_units > 0) AS packs
                        FROM colors c
                        LEFT JOIN finished_stock fs ON c.id = fs.color_id
                        GROUP BY c.id, c.name, c.color_code, c.business_code, c.hsn_code, c.tags, c.min_threshold_kg
                    ),
                    last_production AS (
                        SELECT DISTINCT ON (color_id)
                            color_id,
                            reference_id AS production_id,
                            created_at AS last_produced_at
                        FROM finished_stock_transactions
                        WHERE transaction_type = 'production_entry'
                        ORDER BY color_id, created_at DESC
                    ),
                    last_sale AS (
                        SELECT DISTINCT ON (color_id)
                            color_id,
                            quantity_units AS last_sale_units,
                            created_at AS last_sale_at
                        FROM finished_stock_transactions
                        WHERE transaction_type = 'sale'
                        ORDER BY color_id, created_at DESC
                    )
                    SELECT 
                        i.*,
                        lp.production_id AS last_production_id,
                        lp.last_produced_at,
                        ls.last_sale_units,
                        ls.last_sale_at,
                        CASE 
                            WHEN i.total_mass_kg = 0 AND i.active_threshold > 0 THEN 'critical'
                            WHEN i.total_mass_kg < (i.active_threshold * 0.2) AND i.active_threshold > 0 THEN 'critical'
                            WHEN i.total_mass_kg < i.active_threshold THEN 'low'
                            ELSE 'healthy'
                        END AS stock_status
                    FROM inventory_summary i
                    LEFT JOIN last_production lp ON i.color_id = lp.color_id
                    LEFT JOIN last_sale ls ON i.color_id = ls.color_id
                    ORDER BY i.color_name ASC;
                `

                const result = await client.query(query)

                return reply.status(200).send({
                    data: result.rows
                })

            } catch (err: any) {
                fastify.log.error(err)
                return reply.status(500).send({
                    error: 'Internal Server Error',
                    message: 'Failed to retrieve finished stock summary'
                })
            } finally {
                // Ensure the database client is always released back to the pool
                if (client) {
                    client.release()
                }
            }
        }
    })

    /**
     * GET /inventory/alerts
     * Retrieves raw materials that are at or below their reorder level.
     */
    fastify.get('/alerts', {
        preHandler: [fastify.authenticate, authorizeRole(['admin', 'manager'])],
        schema: {
            querystring: Type.Object({
                threshold: Type.Optional(Type.Number())
            })
        },
        handler: async (request, reply) => {
            const queryParam = (request.query as any)?.threshold
            try {
                // Resolve threshold: prefer query param, fallback to DB setting, fallback to 20
                let threshold: number
                if (queryParam !== undefined) {
                    threshold = Number(queryParam)
                } else {
                    const settingRes = await fastify.db.query(
                        "SELECT value FROM app_settings WHERE key = 'low_stock_threshold'"
                    )
                    threshold = settingRes.rows.length > 0 ? Number(settingRes.rows[0].value) : 20
                }

                // Fetch all raw materials and compute status + reorder dynamically
                const result = await fastify.db.query(`
                    SELECT id, name, unit, current_stock, reorder_level
                    FROM resources
                    ORDER BY name ASC
                `)

                const rows = result.rows.map((r: any) => {
                    const stock = Number(r.current_stock)
                    const reorder_quantity = Math.max(0, threshold - stock)

                    let status: string
                    if (stock === 0) {
                        status = 'critical'
                    } else if (stock < threshold) {
                        status = 'low'
                    } else if (stock === threshold) {
                        status = 'low'
                    } else {
                        status = 'healthy'
                    }

                    return {
                        id: r.id,
                        name: r.name,
                        unit: r.unit,
                        current_stock: stock,
                        reorder_level: Number(r.reorder_level),
                        reorder_quantity,
                        status,
                        threshold
                    }
                })

                // Only return rows that need attention (not healthy) for the alerts section
                const alertRows = rows.filter((r: any) => r.status !== 'healthy')
                return reply.send(alertRows)
            } catch (err: any) {
                fastify.log.error(err)
                return reply.status(500).send({
                    error: 'Internal Server Error',
                    message: 'Failed to retrieve inventory alerts'
                })
            }
        }
    })

    /**
     * GET /inventory/stock-report
     * Returns a flattened view of all finished stock suitable for CSV export.
     */
    fastify.get('/stock-report', {
        preHandler: [fastify.authenticate, authorizeRole(['admin', 'manager', 'sales'])],
        handler: async (request, reply) => {
            try {
                const query = `
                    SELECT 
                        c.name AS "Color", 
                        c.business_code AS "Product Code",
                        fs.pack_size_kg AS "Pack Size (kg)",
                        fs.quantity_units AS "Units in Stock",
                        (fs.pack_size_kg * fs.quantity_units) AS "Total Mass (kg)"
                    FROM finished_stock fs
                    JOIN colors c ON fs.color_id = c.id
                    ORDER BY c.name ASC, fs.pack_size_kg ASC;
                `
                const result = await fastify.db.query(query)
                return reply.send(result.rows)
            } catch (err: any) {
                fastify.log.error(err)
                return reply.status(500).send({
                    error: 'Internal Server Error',
                    message: 'Failed to generate stock report'
                })
            }
        }
    })
    /**
     * POST /inventory/sales
     * Records a sale of finished stock, deducting units and adding a transaction.
     * Accessible by 'admin', 'manager', 'operator', and 'sales'.
     */
    const CreateSaleSchema = Type.Object({
        colorId: Type.Integer(),
        packSizeKg: Type.Number({ exclusiveMinimum: 0 }),
        quantityUnits: Type.Integer({ exclusiveMinimum: 0 }),
        notes: Type.Optional(Type.String())
    })

    fastify.post('/sales', {
        preHandler: [fastify.authenticate, authorizeRole(['admin', 'manager', 'operator', 'sales'])],
        schema: {
            body: CreateSaleSchema
        },
        handler: async (request, reply) => {
            const user = (request as any).user as { id: number }
            const { colorId, packSizeKg, quantityUnits, notes } = request.body
            let client
            try {
                client = await fastify.db.connect()
                await client.query('BEGIN')

                // 1. Check stock
                const stockRes = await client.query(
                    'SELECT quantity_units FROM finished_stock WHERE color_id = $1 AND pack_size_kg = $2',
                    [colorId, packSizeKg]
                )

                if (stockRes.rows.length === 0 || stockRes.rows[0].quantity_units < quantityUnits) {
                    await client.query('ROLLBACK')
                    return reply.status(400).send({
                        error: 'Bad Request',
                        message: 'Insufficient stock or invalid product configuration for this sale'
                    })
                }

                // 2. Deduct stock
                await client.query(
                    'UPDATE finished_stock SET quantity_units = quantity_units - $1, updated_at = CURRENT_TIMESTAMP WHERE color_id = $2 AND pack_size_kg = $3',
                    [quantityUnits, colorId, packSizeKg]
                )

                // 3. Record transaction
                await client.query(
                    `INSERT INTO finished_stock_transactions 
                     (color_id, pack_size_kg, transaction_type, quantity_units, quantity_kg, notes, created_by)
                     VALUES ($1, $2, 'sale', $3, $4, $5, $6)`,
                    [colorId, packSizeKg, -quantityUnits, -(quantityUnits * packSizeKg), notes || 'Sale recorded', user.id]
                )

                await client.query('COMMIT')
                return reply.send({ message: 'Sale recorded successfully' })
            } catch (err: any) {
                if (client) await client.query('ROLLBACK')
                fastify.log.error(err)
                return reply.status(500).send({
                    error: 'Internal Server Error',
                    message: 'Failed to record sale'
                })
            } finally {
                if (client) client.release()
            }
        }
    })
}
