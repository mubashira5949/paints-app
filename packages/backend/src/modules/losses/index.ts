/**
 * Losses API Module
 * Tracks documented product and resource losses.
 */

import { FastifyInstance } from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'
import { authorizeRole } from '../../utils/authorizeRole'

const LossSchema = Type.Object({
    item_type: Type.Union([Type.Literal('finished_good'), Type.Literal('raw_material')]),
    color_id: Type.Optional(Type.Integer()),
    resource_id: Type.Optional(Type.Integer()),
    pack_size_kg: Type.Optional(Type.Number()),
    quantity_units: Type.Optional(Type.Integer()),
    quantity_kg: Type.Number(),
    reason_id: Type.Integer(),
    notes: Type.Optional(Type.String()),
    reference_type: Type.Optional(Type.String()),
    reference_id: Type.Optional(Type.Integer())
})

export default async function (fastifyRaw: FastifyInstance) {
    const fastify = fastifyRaw.withTypeProvider<TypeBoxTypeProvider>()

    /**
     * GET /api/losses - List losses with filters
     */
    fastify.get('/', {
        preHandler: [fastify.authenticate, authorizeRole(['admin', 'manager'])],
        schema: {
            querystring: Type.Object({
                item_type: Type.Optional(Type.String()),
                reason_id: Type.Optional(Type.Integer()),
                start_date: Type.Optional(Type.String()),
                end_date: Type.Optional(Type.String())
            })
        },
        handler: async (request, reply) => {
            const { item_type, reason_id, start_date, end_date } = request.query
            try {
                let query = `
                    SELECT 
                        pl.id,
                        pl.item_type,
                        c.name as color_name,
                        r.name as resource_name,
                        pl.pack_size_kg,
                        pl.quantity_units,
                        pl.quantity_kg,
                        lr.name as reason_name,
                        pl.notes,
                        u.username as documented_by,
                        pl.documented_at,
                        pl.reference_type,
                        pl.reference_id,
                        pr.planned_quantity_kg as target_quantity_kg
                    FROM product_losses pl
                    LEFT JOIN colors c ON pl.color_id = c.id
                    LEFT JOIN resources r ON pl.resource_id = r.id
                    JOIN loss_reasons lr ON pl.reason_id = lr.id
                    JOIN users u ON pl.documented_by = u.id
                    LEFT JOIN production_runs pr ON pl.reference_type = 'production_run' AND pl.reference_id = pr.id
                    WHERE 1=1
                `
                const params: any[] = []
                let idx = 1

                if (item_type) {
                    query += ` AND pl.item_type = $${idx++}`
                    params.push(item_type)
                }
                if (reason_id) {
                    query += ` AND pl.reason_id = $${idx++}`
                    params.push(reason_id)
                }
                if (start_date) {
                    query += ` AND pl.documented_at >= $${idx++}`
                    params.push(start_date)
                }
                if (end_date) {
                    query += ` AND pl.documented_at <= $${idx++}`
                    params.push(end_date)
                }

                query += ` ORDER BY pl.documented_at DESC LIMIT 100`

                const result = await fastify.db.query(query, params)
                return reply.send(result.rows)
            } catch (err) {
                fastify.log.error(err)
                return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to fetch losses' })
            }
        }
    })

    /**
     * GET /api/losses/operator-summary - Summary of highest losses by operator
     */
    fastify.get('/operator-summary', {
        preHandler: [fastify.authenticate, authorizeRole(['admin', 'manager'])],
        handler: async (request, reply) => {
            const query = `
                SELECT 
                    u.id, 
                    u.username, 
                    u.first_name, 
                    u.last_name, 
                    SUM(pl.quantity_kg) as total_loss_kg, 
                    COUNT(pl.id) as loss_incidents
                FROM product_losses pl
                JOIN users u ON pl.documented_by = u.id
                GROUP BY u.id, u.username, u.first_name, u.last_name
                ORDER BY total_loss_kg DESC
                LIMIT 10
            `;
            try {
                const result = await fastify.db.query(query);
                return reply.send(result.rows);
            } catch (err) {
                fastify.log.error(err);
                return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to fetch operator summary' });
            }
        }
    })

    /**
     * GET /api/losses/reasons - List available loss reasons
     */
    fastify.get('/reasons', {
        preHandler: [fastify.authenticate],
        handler: async (request, reply) => {
            const result = await fastify.db.query('SELECT * FROM loss_reasons ORDER BY name ASC')
            return reply.send(result.rows)
        }
    })

    /**
     * POST /api/losses - Document a new loss
     */
    fastify.post('/', {
        preHandler: [fastify.authenticate, authorizeRole(['admin', 'manager'])],
        schema: {
            body: LossSchema
        },
        handler: async (request, reply) => {
            const user = request.user as any
            const { 
                item_type, color_id, resource_id, pack_size_kg, 
                quantity_units, quantity_kg, reason_id, notes, 
                reference_type, reference_id 
            } = request.body
            
            let client
            try {
                client = await fastify.db.connect()
                await client.query('BEGIN')

                // 1. Log the loss
                const lossResult = await client.query(
                    `INSERT INTO product_losses (
                        item_type, color_id, resource_id, pack_size_kg, 
                        quantity_units, quantity_kg, reason_id, notes, 
                        documented_by, reference_type, reference_id
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                    RETURNING id`,
                    [
                        item_type, color_id, resource_id, pack_size_kg, 
                        quantity_units, quantity_kg, reason_id, notes, 
                        user.id, reference_type, reference_id
                    ]
                )

                // 2. Adjust stock
                if (item_type === 'finished_good') {
                    if (!color_id || !pack_size_kg || quantity_units === undefined) {
                        throw new Error('Finished good loss requires colorId, packSize and quantityUnits')
                    }
                    
                    // Decrease finished stock
                    await client.query(
                        `UPDATE finished_stock 
                         SET quantity_units = quantity_units - $1, updated_at = CURRENT_TIMESTAMP
                         WHERE color_id = $2 AND pack_size_kg = $3`,
                        [quantity_units, color_id, pack_size_kg]
                    )

                    // Record finished stock transaction
                    await client.query(
                        `INSERT INTO finished_stock_transactions (
                            color_id, pack_size_kg, transaction_type, 
                            quantity_units, quantity_kg, reference_id, 
                            notes, created_by
                        ) VALUES ($1, $2, 'adjustment', $3, $4, $5, $6, $7)`,
                        [
                            color_id, pack_size_kg, -quantity_units, -quantity_kg, 
                            lossResult.rows[0].id, `Loss Documentation: ${notes || 'No notes'}`, user.id
                        ]
                    )
                } else if (item_type === 'raw_material') {
                    if (!resource_id) {
                        throw new Error('Raw material loss requires resource_id')
                    }
                    
                    // Decrease resource stock
                    await client.query(
                        `UPDATE resources 
                         SET current_stock = current_stock - $1, updated_at = CURRENT_TIMESTAMP
                         WHERE id = $2`,
                        [quantity_kg, resource_id]
                    )

                    // Record resource stock transaction
                    await client.query(
                        `INSERT INTO resource_stock_transactions (
                            resource_id, transaction_type, quantity, 
                            reference_id, notes
                        ) VALUES ($1, 'adjustment', $2, $3, $4)`,
                        [
                            resource_id, -quantity_kg, lossResult.rows[0].id, 
                            `Loss Documentation: ${notes || 'No notes'}`
                        ]
                    )
                }

                await client.query('COMMIT')
                return reply.status(201).send({ message: 'Loss documented successfully', loss_id: lossResult.rows[0].id })
            } catch (err: any) {
                if (client) await client.query('ROLLBACK')
                fastify.log.error(err)
                return reply.status(500).send({ error: 'Internal Server Error', message: `Failed to document loss: ${err.message}` })
            } finally {
                if (client) client.release()
            }
        }
    })
}
