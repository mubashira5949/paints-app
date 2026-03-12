/**
 * Inventory Module
 * Handles retrieving current stock summaries for finished paint products.
 */

import { FastifyInstance } from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
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
        handler: async (request, reply) => {
            let client
            try {
                // Retrieve a connection from the database pool
                client = await fastify.db.connect()

                // SQL Query to summarize finished stock:
                // - Groups rows by color properties (id, name, block code)
                // - Aggregates the total quantity of units across all pack sizes
                // - Calculates the total volume in liters (quantity * pack_size)
                // - Uses json_agg to nest the individual pack sizes into a 'packs' JSON array
                const query = `
                    WITH inventory_summary AS (
                        SELECT 
                            c.id AS color_id,
                            c.name AS color_name,
                            c.color_code,
                            c.business_code,
                            c.series,
                            c.min_threshold_liters,
                            COALESCE(SUM(fs.quantity_units), 0)::integer AS total_quantity_units,
                            COALESCE(SUM(fs.quantity_units * fs.pack_size_liters), 0)::numeric AS total_volume_liters,
                            json_agg(
                                json_build_object(
                                    'pack_size_liters', fs.pack_size_liters,
                                    'quantity_units', fs.quantity_units
                                ) ORDER BY fs.pack_size_liters ASC
                            ) FILTER (WHERE fs.quantity_units > 0) AS packs
                        FROM colors c
                        LEFT JOIN finished_stock fs ON c.id = fs.color_id
                        GROUP BY c.id, c.name, c.color_code, c.business_code, c.series, c.min_threshold_liters
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
                            WHEN i.total_volume_liters = 0 AND i.min_threshold_liters > 0 THEN 'critical'
                            WHEN i.total_volume_liters < (i.min_threshold_liters * 0.2) AND i.min_threshold_liters > 0 THEN 'critical'
                            WHEN i.total_volume_liters < i.min_threshold_liters THEN 'low'
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
        handler: async (request, reply) => {
            try {
                const query = `
                    SELECT id, name, unit, current_stock, reorder_level
                    FROM resources
                    WHERE current_stock <= reorder_level
                    ORDER BY name ASC;
                `
                const result = await fastify.db.query(query)
                return reply.send(result.rows)
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
                        fs.pack_size_liters AS "Pack Size (L)",
                        fs.quantity_units AS "Units in Stock",
                        (fs.pack_size_liters * fs.quantity_units) AS "Total Volume (L)"
                    FROM finished_stock fs
                    JOIN colors c ON fs.color_id = c.id
                    ORDER BY c.name ASC, fs.pack_size_liters ASC;
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
}
