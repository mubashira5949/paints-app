/**
 * Purchase Orders Module
 * Handles procurement flow, order tracking, and returns with inventory synchronization.
 */

import { FastifyInstance } from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'
import { authorizeRole } from '../../utils/authorizeRole'

export default async function (fastifyRaw: FastifyInstance) {
    const fastify = fastifyRaw.withTypeProvider<TypeBoxTypeProvider>()

    const CreatePOItemSchema = Type.Object({
        resource_id: Type.Integer(),
        quantity: Type.Number(),
        unit: Type.String(),
        unit_price: Type.Optional(Type.Number())
    })

    const CreatePOSchema = Type.Object({
        supplier_id: Type.Integer(),
        notes: Type.Optional(Type.String()),
        items: Type.Array(CreatePOItemSchema)
    })

    const POIdParamSchema = Type.Object({
        id: Type.Integer()
    })

    /**
     * GET /purchase-orders - Retrieve all POs
     */
    fastify.get('/', {
        preHandler: [fastify.authenticate],
        handler: async (request, reply) => {
            try {
                const result = await fastify.db.query(`
                    SELECT po.*, s.name as supplier_name, s.email as supplier_email, s.address as supplier_address, s.phone as supplier_phone, s.gst_number as supplier_gst, s.pocs as supplier_pocs,
                    (SELECT json_agg(items) FROM (
                        SELECT poi.*, r.name as resource_name 
                        FROM purchase_order_items poi
                        LEFT JOIN resources r ON poi.resource_id = r.id
                        WHERE poi.purchase_order_id = po.id
                    ) items) as items
                    FROM purchase_orders po
                    LEFT JOIN suppliers s ON po.supplier_id = s.id
                    ORDER BY po.created_at DESC
                `)
                return reply.send(result.rows)
            } catch (err) {
                fastify.log.error(err)
                return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to retrieve POs' })
            }
        }
    })

    /**
     * POST /purchase-orders - Create a new PO
     */
    fastify.post('/', {
        preHandler: [fastify.authenticate, authorizeRole(['admin', 'manager'])],
        schema: {
            body: CreatePOSchema
        },
        handler: async (request, reply) => {
            const { supplier_id, notes, items } = request.body
            const client = await fastify.db.connect()
            try {
                await client.query('BEGIN')
                
                const poResult = await client.query(
                    'INSERT INTO purchase_orders (supplier_id, notes, status) VALUES ($1, $2, $3) RETURNING *',
                    [supplier_id, notes, 'pending']
                )
                const poId = poResult.rows[0].id

                for (const item of items) {
                    await client.query(
                        `INSERT INTO purchase_order_items (purchase_order_id, resource_id, quantity, unit, unit_price) 
                         VALUES ($1, $2, $3, $4, $5)`,
                        [poId, item.resource_id, item.quantity, item.unit, item.unit_price || 0]
                    )
                }

                await client.query('COMMIT')
                
                const fullPO = await client.query(`
                    SELECT po.*, s.name as supplier_name, s.email as supplier_email, s.address as supplier_address, s.phone as supplier_phone, s.gst_number as supplier_gst,
                    (SELECT json_agg(items) FROM (
                        SELECT poi.*, r.name as resource_name 
                        FROM purchase_order_items poi
                        LEFT JOIN resources r ON poi.resource_id = r.id
                        WHERE poi.purchase_order_id = po.id
                    ) items) as items
                    FROM purchase_orders po
                    LEFT JOIN suppliers s ON po.supplier_id = s.id
                    WHERE po.id = $1
                `, [poId])

                return reply.status(201).send(fullPO.rows[0])
            } catch (err) {
                await client.query('ROLLBACK')
                fastify.log.error(err)
                return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to create PO' })
            } finally {
                client.release()
            }
        }
    })

    /**
     * PUT /purchase-orders/:id/status - Update PO status and sync inventory
     */
    fastify.put('/:id/status', {
        preHandler: [fastify.authenticate, authorizeRole(['admin', 'manager'])],
        schema: {
            params: POIdParamSchema,
            body: Type.Object({ status: Type.String() })
        },
        handler: async (request, reply) => {
            const { id } = request.params
            const { status } = request.body
            const client = await fastify.db.connect()
            try {
                await client.query('BEGIN')
                
                // Get pre-update status to prevent double-counting
                const currentPO = await client.query('SELECT status FROM purchase_orders WHERE id = $1', [id])
                if (currentPO.rows.length === 0) {
                    await client.query('ROLLBACK')
                    return reply.status(404).send({ error: 'Not Found', message: 'PO not found' })
                }
                
                const oldStatus = currentPO.rows[0].status
                
                // Update the PO status
                const upResult = await client.query(
                    'UPDATE purchase_orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
                    [status, id]
                )

                // If status changed to 'received' and it wasn't already received
                if (status === 'received' && oldStatus !== 'received') {
                    const items = await client.query('SELECT resource_id, quantity FROM purchase_order_items WHERE purchase_order_id = $1', [id])
                    for (const item of items.rows) {
                        if (item.resource_id) {
                            await client.query(
                                'UPDATE resources SET current_stock = current_stock + $1 WHERE id = $2',
                                [item.quantity, item.resource_id]
                            )
                        }
                    }
                }

                await client.query('COMMIT')
                return reply.send(upResult.rows[0])
            } catch (err) {
                await client.query('ROLLBACK')
                fastify.log.error(err)
                return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to update order status' })
            } finally {
                client.release()
            }
        }
    })

    /**
     * PUT /purchase-orders/:id/items/:item_id - Update item quantity/meta
     */
    fastify.put('/:id/items/:item_id', {
        preHandler: [fastify.authenticate, authorizeRole(['admin', 'manager'])],
        schema: {
            params: Type.Object({ id: Type.Integer(), item_id: Type.Integer() }),
            body: Type.Object({
                quantity: Type.Number(),
                unit_price: Type.Optional(Type.Number())
            })
        },
        handler: async (request, reply) => {
            const { item_id } = request.params
            const { quantity, unit_price } = request.body
            try {
                const updates: string[] = ['quantity = $1']
                const values: any[] = [quantity]
                
                if (unit_price !== undefined) {
                    updates.push(`unit_price = $${values.length + 1}`)
                    values.push(unit_price)
                }

                values.push(item_id)
                const result = await fastify.db.query(
                    `UPDATE purchase_order_items SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP 
                     WHERE id = $${values.length} RETURNING *`,
                    values
                )
                return reply.send(result.rows[0])
            } catch (err) {
                fastify.log.error(err)
                return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to update order item' })
            }
        }
    })

    /**
     * POST /purchase-orders/:id/refund - Handle partial refund/return and sync inventory
     */
    fastify.post('/:id/refund', {
        preHandler: [fastify.authenticate, authorizeRole(['admin', 'manager'])],
        schema: {
            params: POIdParamSchema,
            body: Type.Object({
                item_id: Type.Integer(),
                refunded_quantity: Type.Number(),
                refund_status: Type.String()
            })
        },
        handler: async (request, reply) => {
            const { item_id, refunded_quantity, refund_status } = request.body
            const client = await fastify.db.connect()
            try {
                await client.query('BEGIN')
                
                // Get item and PO status to see if it was already received
                const itemData = await client.query(`
                    SELECT poi.resource_id, poi.refund_status, po.status as po_status
                    FROM purchase_order_items poi
                    JOIN purchase_orders po ON poi.purchase_order_id = po.id
                    WHERE poi.id = $1
                `, [item_id])

                if (itemData.rows.length === 0) {
                    await client.query('ROLLBACK')
                    return reply.status(404).send({ error: 'Not Found', message: 'Item not found' })
                }

                const item = itemData.rows[0]
                
                // Update refund status
                const result = await client.query(
                    `UPDATE purchase_order_items 
                     SET refunded_quantity = $1, refund_status = $2, updated_at = CURRENT_TIMESTAMP 
                     WHERE id = $3 RETURNING *`,
                    [refunded_quantity, refund_status, item_id]
                )

                // If refund is completed and the PO was already received, deduct from inventory
                if (refund_status === 'completed' && item.refund_status !== 'completed' && item.po_status === 'received') {
                    if (item.resource_id) {
                        await client.query(
                            'UPDATE resources SET current_stock = current_stock - $1 WHERE id = $2',
                            [refunded_quantity, item.resource_id]
                        )
                    }
                }

                await client.query('COMMIT')
                return reply.send(result.rows[0])
            } catch (err) {
                await client.query('ROLLBACK')
                fastify.log.error(err)
                return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to process refund' })
            } finally {
                client.release()
            }
        }
    })
}
