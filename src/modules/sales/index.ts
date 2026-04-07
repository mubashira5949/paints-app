import { FastifyInstance } from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'
import { authorizeRole } from '../../utils/authorizeRole'

export default async function (fastifyRaw: FastifyInstance) {
    fastifyRaw.log.info('Sales module registering...')
    const fastify = fastifyRaw.withTypeProvider<TypeBoxTypeProvider>()

    /**
     * GET /sales/export-hsn
     * Exports an HSN-wise sales report as CSV.
     */
    fastify.get('/export-hsn', {
        preHandler: [fastify.authenticate, authorizeRole(['admin', 'manager'])],
        handler: async (request, reply) => {
            fastify.log.info('HSN-wise sales report requested')
            let client
            try {
                client = await fastify.db.connect()
                const result = await client.query(`
                    SELECT 
                        COALESCE(c.hsn_code, 'N/A') as hsn_code,
                        c.name as product_name,
                        SUM(ABS(t.quantity_units)) as total_units,
                        SUM(ABS(t.quantity_kg)) as total_weight_kg
                    FROM finished_stock_transactions t
                    JOIN colors c ON t.color_id = c.id
                    WHERE t.transaction_type = 'sale'
                    GROUP BY c.hsn_code, c.name
                    ORDER BY c.hsn_code, c.name
                `)

                let csv = 'HSN Code,Product Name,Total Units,Total Weight (KG)\n'
                result.rows.forEach(row => {
                    const rawName = row.product_name || 'Unknown Product'
                    const productName = rawName.includes(',') ? `"${rawName}"` : rawName
                    csv += `${row.hsn_code},${productName},${row.total_units || 0},${row.total_weight_kg || 0}\n`
                })

                reply.header('Content-Type', 'text/csv')
                reply.header('Content-Disposition', 'attachment; filename=hsn_wise_sales_report.csv')
                return reply.send(csv)
            } catch (err) {
                fastify.log.error(err)
                return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to generate report' })
            } finally {
                if (client) client.release()
            }
        }
    })

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

                const result = await client.query(`
                    SELECT 
                        o.id, o.status, o.notes, o.created_at,
                        o.shipping_status, o.payment_method, o.payment_status,
                        o.return_status, o.refund_status,
                        o.client_name,
                        cl.id          AS client_id,
                        cl.name        AS client_display_name,
                        cl.gst_number,
                        cl.contact_phone,
                        cl.contact_email,
                        sa.label       AS shipping_label,
                        sa.address     AS shipping_address,
                        u.username     AS logged_by,
                        COALESCE(
                            json_agg(
                                json_build_object(
                                    'item_id',      i.id,
                                    'color_id',     c.id,
                                    'color_name',   c.name,
                                    'business_code', c.business_code,
                                    'pack_size_kg', i.pack_size_kg,
                                    'quantity',     i.quantity
                                )
                            ) FILTER (WHERE i.id IS NOT NULL),
                            '[]'
                        ) AS items
                    FROM client_orders o
                    LEFT JOIN clients cl ON o.client_id = cl.id
                    LEFT JOIN client_shipping_addresses sa ON o.shipping_address_id = sa.id
                    LEFT JOIN client_order_items i ON o.id = i.order_id
                    LEFT JOIN colors c ON i.color_id = c.id
                    LEFT JOIN users u ON o.created_by = u.id
                    GROUP BY o.id, cl.id, sa.id, u.username
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
        clientId:          Type.Integer(),
        shippingAddressId: Type.Optional(Type.Integer()),
        notes:             Type.Optional(Type.String()),
        items: Type.Array(Type.Object({
            colorId:    Type.Integer(),
            packSizeKg: Type.Number({ exclusiveMinimum: 0 }),
            quantity:   Type.Integer({ exclusiveMinimum: 0 })
        }))
    })

    fastify.post('/orders', {
        preHandler: [fastify.authenticate, authorizeRole(['admin', 'manager', 'sales'])],
        schema: { body: CreateOrderSchema },
        handler: async (request, reply) => {
            const user = (request as any).user as { id: number }
            const { clientId, shippingAddressId, notes, items } = request.body
            let client
            try {
                client = await fastify.db.connect()
                await client.query('BEGIN')

                // Resolve the client name from the FK so we keep client_name in sync
                const clientRes = await client.query('SELECT name FROM clients WHERE id = $1', [clientId])
                if (clientRes.rows.length === 0) {
                    await client.query('ROLLBACK')
                    return reply.status(404).send({ error: 'Not Found', message: 'Client not found' })
                }
                const clientName = clientRes.rows[0].name

                const orderRes = await client.query(
                    `INSERT INTO client_orders (client_id, client_name, shipping_address_id, notes, created_by)
                     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
                    [clientId, clientName, shippingAddressId || null, notes || null, user.id]
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

    /**
     * PUT /sales/orders/:id/status
     * Updates the status of an order (shipping, return, refund, overall status).
     * Automatically handles inventory restocking if items are returned to warehouse.
     */
    const UpdateOrderStatusSchema = Type.Object({
        status: Type.Optional(Type.String()),
        shipping_status: Type.Optional(Type.String()),
        payment_method: Type.Optional(Type.String()),
        payment_status: Type.Optional(Type.String()),
        return_status: Type.Optional(Type.String()),
        refund_status: Type.Optional(Type.String())
    })

    fastify.put('/orders/:id/status', {
        preHandler: [fastify.authenticate, authorizeRole(['admin', 'manager', 'sales', 'operator'])],
        schema: { params: Type.Object({ id: Type.Integer() }), body: UpdateOrderStatusSchema },
        handler: async (request, reply) => {
            const { id } = request.params
            const updates = request.body
            const user = (request as any).user as { id: number }
            let client
            try {
                client = await fastify.db.connect()
                await client.query('BEGIN')

                // check current state
                const currentRes = await client.query('SELECT return_status FROM client_orders WHERE id = $1', [id])
                if (currentRes.rows.length === 0) {
                    await client.query('ROLLBACK')
                    return reply.status(404).send({ error: 'Not Found', message: 'Order not found' })
                }
                const currentReturnStatus = currentRes.rows[0].return_status

                // build update query dynamically
                const updateFields: string[] = []
                const params: any[] = []
                let paramIndex = 1

                for (const [key, value] of Object.entries(updates)) {
                    if (value !== undefined) {
                        updateFields.push(`${key} = $${paramIndex}`)
                        params.push(value)
                        paramIndex++
                    }
                }

                if (updateFields.length > 0) {
                    params.push(id)
                    await client.query(
                        `UPDATE client_orders SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`,
                        params
                    )
                }

                // If return_status changes to 'delivered_to_warehouse' and it wasn't before, we restock items
                if (updates.return_status === 'delivered_to_warehouse' && currentReturnStatus !== 'delivered_to_warehouse') {
                    // Get items
                    const itemsRes = await client.query('SELECT color_id, pack_size_kg, quantity FROM client_order_items WHERE order_id = $1', [id])
                    
                    for (const item of itemsRes.rows) {
                        const quantityKg = item.pack_size_kg * item.quantity
                        await client.query(`
                            INSERT INTO finished_stock_transactions 
                            (color_id, pack_size_kg, quantity_units, quantity_kg, transaction_type, notes, created_by)
                            VALUES ($1, $2, $3, $4, 'production', 'Restock from returned order #' || $5, $6)
                        `, [item.color_id, item.pack_size_kg, item.quantity, quantityKg, id, user.id])
                    }
                }

                // update general status based on workflow
                if (updates.shipping_status === 'delivered' && !updates.return_status) {
                    await client.query(`UPDATE client_orders SET status = 'fulfilled' WHERE id = $1`, [id])
                }
                if (updates.refund_status === 'refund_successfully') {
                    await client.query(`UPDATE client_orders SET status = 'fulfilled' WHERE id = $1`, [id])
                }

                await client.query('COMMIT')
                return reply.send({ message: 'Order status updated successfully' })
            } catch (err) {
                if (client) await client.query('ROLLBACK')
                fastify.log.error(err)
                return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to update order status' })
            } finally {
                if (client) client.release()
            }
        }
    })

    /**
     * GET /sales/orders/demand
     * Aggregates pending order quantities for production planning.
     */
    fastify.get('/orders/demand', {
        preHandler: [fastify.authenticate, authorizeRole(['admin', 'manager', 'operator', 'sales'])],
        handler: async (request, reply) => {
            let client
            try {
                client = await fastify.db.connect()
                const result = await client.query(`
                    SELECT 
                        i.color_id,
                        c.name as color_name,
                        c.business_code,
                        SUM(i.quantity * i.pack_size_kg) as total_qty_kg,

                        COUNT(DISTINCT o.id) as order_count,
                        ARRAY_AGG(DISTINCT cl.name) as client_names,
                        json_agg(
                            json_build_object(
                                'pack_size_kg', i.pack_size_kg,
                                'quantity', i.quantity
                            )
                        ) as raw_packs
                    FROM client_orders o
                    JOIN client_order_items i ON o.id = i.order_id
                    JOIN colors c ON i.color_id = c.id
                    LEFT JOIN clients cl ON o.client_id = cl.id
                    WHERE o.status = 'pending'
                    GROUP BY i.color_id, c.name, c.business_code
                    ORDER BY total_qty_kg DESC
                `)

                const transformed = result.rows.map(row => {
                    const packMap: Record<number, number> = {};
                    (row.raw_packs || []).forEach((p: any) => {
                        packMap[p.pack_size_kg] = (packMap[p.pack_size_kg] || 0) + p.quantity;
                    });
                    const groupedPacks = Object.keys(packMap).map(k => ({
                        pack_size_kg: Number(k),
                        quantity: packMap[Number(k)]
                    }));
                    
                    const { raw_packs, ...rest } = row;
                    return {
                        ...rest,
                        required_packs: groupedPacks
                    };
                });

                return reply.send(transformed)
            } catch (err) {
                fastify.log.error(err)
                return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to retrieve order demand' })
            } finally {
                if (client) client.release()
            }
        }
    })

    /**
     * GET /sales/trends
     * Returns trending products and sales by client, plus unsold/returned/wastage stats.
     */
    fastify.get('/trends', {
        preHandler: [fastify.authenticate, authorizeRole(['admin', 'manager', 'sales', 'operator'])],
        handler: async (request, reply) => {
            let client
            try {
                client = await fastify.db.connect()

                const trendingProductsRes = await client.query(`
                    SELECT 
                        c.name as color_name,
                        cl.name as client_name,
                        SUM(i.quantity * i.pack_size_kg) as total_kg
                    FROM client_order_items i
                    JOIN client_orders o ON i.order_id = o.id
                    JOIN colors c ON i.color_id = c.id
                    LEFT JOIN clients cl ON o.client_id = cl.id
                    WHERE o.status != 'cancelled'
                    GROUP BY c.name, cl.name
                    ORDER BY total_kg DESC
                    LIMIT 50
                `)

                const trendingClientsRes = await client.query(`
                    SELECT 
                        cl.name as client_name,
                        SUM(i.quantity * i.pack_size_kg) as total_kg,
                        COUNT(DISTINCT o.id) as order_count
                    FROM client_orders o
                    LEFT JOIN client_order_items i ON o.id = i.order_id
                    LEFT JOIN clients cl ON o.client_id = cl.id
                    WHERE o.status != 'cancelled' AND cl.name IS NOT NULL
                    GROUP BY cl.name
                    ORDER BY total_kg DESC
                `)

                const inventoryStatsRes = await client.query(`
                    SELECT 
                        (SELECT COALESCE(SUM(quantity_units * pack_size_kg), 0) FROM finished_stock WHERE quantity_units > 0) as unsold_kg,
                        (SELECT COALESCE(SUM(ABS(quantity_kg)), 0) FROM finished_stock_transactions WHERE notes ILIKE '%restock from returned order%') as returned_kg
                `)

                const wastageRes = await client.query(`
                    SELECT lr.name as reason, SUM(pl.quantity_kg) as total_kg 
                    FROM product_losses pl 
                    JOIN loss_reasons lr ON pl.reason_id = lr.id 
                    GROUP BY lr.name
                `)

                return reply.send({
                    trendingProducts: trendingProductsRes.rows,
                    trendingClients: trendingClientsRes.rows,
                    inventoryStats: inventoryStatsRes.rows[0],
                    wastage: wastageRes.rows
                })
            } catch (err) {
                fastify.log.error(err)
                return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to retrieve trends' })
            } finally {
                if (client) client.release()
            }
        }
    })
}
