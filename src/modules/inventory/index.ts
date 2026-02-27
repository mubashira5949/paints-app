/**
 * Inventory Module
 * Handles retrieving current stock summaries for finished paint products.
 */

import { FastifyInstance } from 'fastify'
import { authorizeRole } from '../../utils/authorizeRole'

export default async function (fastify: FastifyInstance) {
    /**
     * GET /inventory/finished-stock
     * Retrieves a summarized view of finished stock grouped by color and pack size.
     * Accessible by 'admin', 'manager', 'sales', and 'client'.
     */
    fastify.get('/finished-stock', {
        preHandler: [fastify.authenticate, authorizeRole(['admin', 'manager', 'sales', 'client'])],
        handler: async (request: any, reply: any) => {
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
                    SELECT 
                        c.id AS color_id,
                        c.name AS color_name,
                        c.color_code,
                        COALESCE(SUM(fs.quantity_units), 0)::integer AS total_quantity_units,
                        COALESCE(SUM(fs.quantity_units * fs.pack_size_liters), 0)::numeric AS total_volume_liters,
                        json_agg(
                            json_build_object(
                                'pack_size_liters', fs.pack_size_liters,
                                'quantity_units', fs.quantity_units
                            ) ORDER BY fs.pack_size_liters ASC
                        ) AS packs
                    FROM finished_stock fs
                    JOIN colors c ON fs.color_id = c.id
                    WHERE fs.quantity_units > 0
                    GROUP BY c.id, c.name, c.color_code
                    ORDER BY c.name ASC;
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
}
