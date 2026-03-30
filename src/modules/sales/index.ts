import { FastifyInstance } from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'
import { authorizeRole } from '../../utils/authorizeRole'

export default async function (fastifyRaw: FastifyInstance) {
    const fastify = fastifyRaw.withTypeProvider<TypeBoxTypeProvider>()

    /**
     * GET /sales/transactions
     * Retrieves sales transactions.
     * Restricted view: Sales role only sees their own transactions.
     * Admin/Manager can see all.
     */
    fastify.get('/transactions', {
        preHandler: [fastify.authenticate, authorizeRole(['admin', 'manager', 'sales', 'operator'])],
        handler: async (request, reply) => {
            const user = (request as any).user as { id: number, role: string }
            let client
            try {
                client = await fastify.db.connect()

                let query = `
                    SELECT 
                        t.id, t.color_id, c.name AS color_name, c.business_code, 
                        t.pack_size_kg, t.quantity_units, t.quantity_kg, t.notes, t.created_at,
                        u.username AS logged_by
                    FROM finished_stock_transactions t
                    JOIN colors c ON t.color_id = c.id
                    LEFT JOIN users u ON t.created_by = u.id
                    WHERE t.transaction_type = 'sale'
                `
                const params: any[] = []

                if (user.role === 'sales') {
                    // Only view their own logged sales
                    query += ` AND (t.created_by = $1 OR t.created_by IS NULL)`
                    params.push(user.id)
                }

                query += ` ORDER BY t.created_at DESC`

                const result = await client.query(query, params)
                return reply.send(result.rows)
            } catch (err) {
                fastify.log.error(err)
                return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to retrieve sales transactions' })
            } finally {
                if (client) client.release()
            }
        }
    })

    /**
     * GET /sales/orders
     * Retrieves all client orders. Accessible to all sales/managers/admins.
     */
    fastify.get('/orders', {
        preHandler: [fastify.authenticate, authorizeRole(['admin', 'manager', 'sales'])],
        handler: async (request, reply) => {
            let client
            try {
                client = await fastify.db.connect()

                // Include item details nested as JSON
                const result = await client.query(`
                    SELECT 
                        o.id, o.client_name, o.status, o.notes, o.created_at, u.username as logged_by,
                        COALESCE(
                            json_agg(
                                json_build_object(
                                    'item_id', i.id,
                                    'color_id', c.id,
                                    'color_name', c.name,
                                    'business_code', c.business_code,
                                    'pack_size_kg', i.pack_size_kg,
                                    'quantity', i.quantity
                                )
                            ) FILTER (WHERE i.id IS NOT NULL),
                            '[]'
                        ) AS items
                    FROM client_orders o
                    LEFT JOIN client_order_items i ON o.id = i.order_id
                    LEFT JOIN colors c ON i.color_id = c.id
                    LEFT JOIN users u ON o.created_by = u.id
                    GROUP BY o.id, u.username
                    ORDER BY o.created_at DESC
                `)
                return reply.send(result.rows)
            } catch (err) {
                fastify.log.error(err)
                return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to retrieve orders' })
            } finally {
                if (client) client.release()
            }
        }
    })

    /**
     * POST /sales/orders
     * Creates a new client order.
     */
    const CreateOrderSchema = Type.Object({
        clientName: Type.String({ minLength: 1 }),
        notes: Type.Optional(Type.String()),
        items: Type.Array(Type.Object({
            colorId: Type.Integer(),
            packSizeKg: Type.Number({ exclusiveMinimum: 0 }),
            quantity: Type.Integer({ exclusiveMinimum: 0 })
        }))
    })

    fastify.post('/orders', {
        preHandler: [fastify.authenticate, authorizeRole(['admin', 'manager', 'sales'])],
        schema: { body: CreateOrderSchema },
        handler: async (request, reply) => {
            const user = (request as any).user as { id: number }
            const { clientName, notes, items } = request.body
            let client
            try {
                client = await fastify.db.connect()
                await client.query('BEGIN')

                const orderRes = await client.query(
                    `INSERT INTO client_orders (client_name, notes, created_by)
                     VALUES ($1, $2, $3) RETURNING id`,
                    [clientName, notes || null, user.id]
                )
                const orderId = orderRes.rows[0].id

                for (const item of items) {
                    await client.query(
                        `INSERT INTO client_order_items (order_id, color_id, pack_size_kg, quantity)
                         VALUES ($1, $2, $3, $4)`,
                        [orderId, item.colorId, item.packSizeKg, item.quantity]
                    )
                }

                await client.query('COMMIT')
                return reply.status(201).send({ message: 'Order created successfully' })
            } catch (err) {
                if (client) await client.query('ROLLBACK')
                fastify.log.error(err)
                return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to create order' })
            } finally {
                if (client) client.release()
            }
        }
    })
}
