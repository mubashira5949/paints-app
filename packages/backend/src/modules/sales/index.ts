/**
 * Sales module — spec §3.4 + §3.5 + §3.6.
 *
 * Visibility rule (§3.4): Sales reps see all orders' line items, but financial
 * fields (negotiated price, line totals, money collected) only on orders they
 * themselves placed; Managers see all.
 */

import { FastifyInstance } from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'
import { authorizeRole } from '../../utils/authorizeRole'
import { withTransaction } from '../../utils/withTransaction'
import {
    listCustomerOrders, getCustomerOrder, insertCustomerOrder, insertCustomerOrderItem,
    getCustomerOrderStatus, patchCustomerOrder,
    submitCustomerOrder, approveCustomerOrder, cancelCustomerOrder,
    getOrderForConfirmation, getOrderItemsForConfirmation, nextConfirmationVersion,
    insertOrderConfirmation,
    listOrderItemsForCost, variantCostBaseline,
    lockCustomerOrderForSale, insertSale, getOrderItemForSale,
    insertSaleItem, claimPackForSale, linkPackToSaleItem,
    listSales, getSale, insertPayment,
    getSaleForReturn, insertReturn, insertReturnItem,
    setPackReadyAfterReturn, setPackLostAfterReturn,
    insertRefund, approveRefund, rejectRefund,
    lockRefundForPayout, insertRefundPayout, sumRefundPayouts, markRefundPaidOut,
} from '../../queries'

const IdParam     = Type.Object({ id:     Type.Integer({ minimum: 1 }) })
const SaleIdParam = Type.Object({ saleId: Type.Integer({ minimum: 1 }) })

const Currency      = Type.String({ pattern: '^[A-Z]{3}$', maxLength: 3 })
const PaymentTerms  = Type.Union([Type.Literal('prepaid'), Type.Literal('cod'), Type.Literal('net')])
const PaymentMethod = Type.Union([
    Type.Literal('cash'), Type.Literal('bank_transfer'), Type.Literal('upi'),
    Type.Literal('cheque'), Type.Literal('card'), Type.Literal('other'),
])
const ReturnCondition   = Type.Union([Type.Literal('good'), Type.Literal('damaged'), Type.Literal('expired'), Type.Literal('other')])
const ReturnDisposition = Type.Union([Type.Literal('re_inventory'), Type.Literal('lost')])

const OrderItemInput = Type.Object({
    variant_id:                Type.Integer({ minimum: 1 }),
    pack_size_kg:              Type.Number({ exclusiveMinimum: 0 }),
    quantity:                  Type.Integer({ exclusiveMinimum: 0 }),
    negotiated_price_per_pack: Type.Number({ minimum: 0 }),
})

const CreateOrderBody = Type.Object({
    customer_id:         Type.Integer({ minimum: 1 }),
    shipping_address_id: Type.Optional(Type.Integer({ minimum: 1 })),
    currency:            Type.Optional(Currency),
    payment_terms:       Type.Optional(PaymentTerms),
    payment_net_days:    Type.Optional(Type.Integer({ minimum: 0 })),
    scheduled_ship_date: Type.Optional(Type.String({ format: 'date' })),
    notes:               Type.Optional(Type.String()),
    items:               Type.Array(OrderItemInput, { minItems: 1, maxItems: 200 }),
})

const PatchOrderBody = Type.Object({
    shipping_address_id: Type.Optional(Type.Integer({ minimum: 1 })),
    currency:            Type.Optional(Currency),
    payment_terms:       Type.Optional(PaymentTerms),
    payment_net_days:    Type.Optional(Type.Union([Type.Integer({ minimum: 0 }), Type.Null()])),
    scheduled_ship_date: Type.Optional(Type.Union([Type.String({ format: 'date' }), Type.Null()])),
    notes:               Type.Optional(Type.String()),
})

const SaleItemInput = Type.Object({
    order_item_id:  Type.Integer({ minimum: 1 }),
    variant_id:     Type.Integer({ minimum: 1 }),
    pack_size_kg:   Type.Number({ exclusiveMinimum: 0 }),
    quantity:       Type.Integer({ exclusiveMinimum: 0 }),
    price_per_pack: Type.Optional(Type.Number({ minimum: 0 })),
    pack_ids:       Type.Optional(Type.Array(Type.Integer({ minimum: 1 }), { minItems: 1, maxItems: 500 })),
})

const CreateSaleBody = Type.Object({
    items: Type.Array(SaleItemInput, { minItems: 1, maxItems: 200 }),
    notes: Type.Optional(Type.String()),
})

const CreatePaymentBody = Type.Object({
    amount:            Type.Number({ exclusiveMinimum: 0 }),
    currency:          Currency,
    date_received:     Type.String({ format: 'date' }),
    method:            PaymentMethod,
    reference_number:  Type.Optional(Type.String({ maxLength: 255 })),
    receiving_account: Type.Optional(Type.String({ maxLength: 255 })),
    attachment_url:    Type.Optional(Type.String({ maxLength: 2048 })),
    notes:             Type.Optional(Type.String()),
})

const ReturnItemInput = Type.Object({
    sale_item_id: Type.Integer({ minimum: 1 }),
    pack_id:      Type.Optional(Type.Integer({ minimum: 1 })),
    condition:    ReturnCondition,
    disposition:  ReturnDisposition,
    notes:        Type.Optional(Type.String()),
})

const CreateReturnBody = Type.Object({
    items:           Type.Array(ReturnItemInput, { minItems: 1, maxItems: 200 }),
    notes:           Type.Optional(Type.String()),
    refund_amount:   Type.Optional(Type.Number({ minimum: 0 })),
    refund_currency: Type.Optional(Currency),
})

const RejectRefundBody = Type.Object({ reason: Type.String({ minLength: 1, maxLength: 1000 }) })

const RefundPayoutBody = Type.Object({
    amount:           Type.Number({ exclusiveMinimum: 0 }),
    currency:         Currency,
    date_paid:        Type.String({ format: 'date' }),
    method:           PaymentMethod,
    reference_number: Type.Optional(Type.String({ maxLength: 255 })),
    paying_account:   Type.Optional(Type.String({ maxLength: 255 })),
    attachment_url:   Type.Optional(Type.String({ maxLength: 2048 })),
    notes:            Type.Optional(Type.String()),
})

const ListOrdersQuery = Type.Object({
    page:        Type.Optional(Type.Integer({ minimum: 1 })),
    page_size:   Type.Optional(Type.Integer({ minimum: 1, maximum: 100 })),
    status:      Type.Optional(Type.String({ maxLength: 50 })),
    customer_id: Type.Optional(Type.Integer({ minimum: 1 })),
})

function derivePaymentStatus(billed: any, collected: any): 'unpaid' | 'partial' | 'paid' | 'overpaid' {
    const b = Number(billed ?? 0); const c = Number(collected ?? 0); const tol = 0.01
    if (c <= 0)            return 'unpaid'
    if (c + tol < b)       return 'partial'
    if (c > b + tol)       return 'overpaid'
    return 'paid'
}

async function computeCostToBuild(db: any, variantId: number, packSizeKg: number): Promise<number | null> {
    const rows = await variantCostBaseline.run({ variant_id: variantId }, db)
    if (rows.length === 0) return null
    const std = Number(rows[0].standard_output_kg)
    if (std <= 0) return null
    return Number(((Number(rows[0].total_cost) / std) * packSizeKg).toFixed(4))
}

async function computeDueDate(tx: any, paymentTerms: 'prepaid' | 'cod' | 'net', netDays: number | null, scheduledShipDate: string | null): Promise<string | null> {
    if (paymentTerms === 'prepaid') return new Date().toISOString().slice(0, 10)
    if (paymentTerms === 'cod')     return scheduledShipDate
    if (paymentTerms === 'net' && netDays != null) {
        const r = await tx.query(`SELECT (CURRENT_DATE + ($1 || ' days')::interval)::date AS d`, [String(netDays)])
        return r.rows[0].d
    }
    return null
}

export default async function (fastifyRaw: FastifyInstance) {
    const fastify = fastifyRaw.withTypeProvider<TypeBoxTypeProvider>()

    // orders

    fastify.get('/orders', {
        preHandler: [fastify.authenticate, authorizeRole(['manager', 'sales'])],
        schema: { querystring: ListOrdersQuery },
        handler: async (request) => {
            const q = request.query
            const page = q.page ?? 1
            const page_size = q.page_size ?? 20
            const rows = await listCustomerOrders.run({
                page_size, page_offset: (page - 1) * page_size,
                status: (q.status ?? null) as any,
                customer_id: q.customer_id ?? null,
            }, fastify.db)
            const total = rows[0]?._total ? Number(rows[0]._total) : 0
            return { items: rows.map(({ _total, ...r }) => r), total, page, page_size }
        },
    })

    fastify.get('/orders/:id', {
        preHandler: [fastify.authenticate, authorizeRole(['manager', 'sales'])],
        schema: { params: IdParam },
        handler: async (request, reply) => {
            const u = request.user as any
            const rows = await getCustomerOrder.run({ id: request.params.id }, fastify.db)
            if (rows.length === 0) return reply.status(404).send({ error: 'Not Found', message: 'Order not found' })
            const order = rows[0]
            if (u.role !== 'manager' && order.created_by !== u.id) {
                order.items = (order.items as any[]).map((it: any) => ({
                    ...it, negotiated_price_per_pack: null, cost_to_build_per_pack: null,
                }))
            }
            return order
        },
    })

    fastify.post('/orders', {
        preHandler: [fastify.authenticate, authorizeRole(['manager', 'sales'])],
        schema: { body: CreateOrderBody },
        handler: async (request, reply) => {
            const u = request.user as any
            const b = request.body
            if ((b.payment_terms ?? 'prepaid') === 'net' && b.payment_net_days == null) {
                return reply.status(400).send({ error: 'Bad Request', message: 'payment_net_days required when payment_terms=net' })
            }
            try {
                const id = await withTransaction(fastify.db, async (tx) => {
                    const dueDate = await computeDueDate(tx, b.payment_terms ?? 'prepaid', b.payment_net_days ?? null, b.scheduled_ship_date ?? null)
                    const [order] = await insertCustomerOrder.run({
                        customer_id: b.customer_id, shipping_address_id: b.shipping_address_id ?? null,
                        currency: b.currency ?? null, payment_terms: b.payment_terms ?? null,
                        payment_net_days: b.payment_net_days ?? null,
                        scheduled_ship_date: b.scheduled_ship_date ?? null,
                        due_date: dueDate, notes: b.notes ?? null, user_id: u.id,
                    }, tx)
                    for (const item of b.items) {
                        const cost = await computeCostToBuild(tx, item.variant_id, item.pack_size_kg)
                        await insertCustomerOrderItem.run({
                            order_id: order.id, variant_id: item.variant_id,
                            pack_size_kg: item.pack_size_kg as any, quantity: item.quantity,
                            negotiated_price_per_pack: item.negotiated_price_per_pack as any,
                            cost_to_build_per_pack: cost as any,
                        }, tx)
                    }
                    return order.id
                })
                return reply.status(201).send({ id })
            } catch (err: any) {
                if (err.code === '23503') return reply.status(400).send({ error: 'Bad Request', message: 'Unknown customer/variant/address id' })
                if (err.code === '23514') return reply.status(400).send({ error: 'Bad Request', message: err.message })
                fastify.log.error(err)
                return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to create order' })
            }
        },
    })

    fastify.patch('/orders/:id', {
        preHandler: [fastify.authenticate, authorizeRole(['manager', 'sales'])],
        schema: { params: IdParam, body: PatchOrderBody },
        handler: async (request, reply) => {
            const u = request.user as any
            const id = request.params.id
            const cur = await getCustomerOrderStatus.run({ id }, fastify.db)
            if (cur.length === 0) return reply.status(404).send({ error: 'Not Found', message: 'Order not found' })
            const s = cur[0].status as string
            const productionStarted = ['in_production', 'ready_for_shipment', 'shipped', 'completed'].includes(s)
            if (productionStarted && u.role !== 'manager') {
                return reply.status(403).send({ error: 'Forbidden', message: 'Order changes after production starts require Manager approval' })
            }
            if (s === 'cancelled' || s === 'completed') {
                return reply.status(409).send({ error: 'Conflict', message: `Order is ${s} and can no longer be edited` })
            }
            const b = request.body
            const hasField = b.shipping_address_id !== undefined || b.currency !== undefined
                || b.payment_terms !== undefined || b.payment_net_days !== undefined
                || b.scheduled_ship_date !== undefined || b.notes !== undefined
            if (!hasField) return reply.status(400).send({ error: 'Bad Request', message: 'No fields to update' })
            const rows = await patchCustomerOrder.run({
                id, shipping_address_id: b.shipping_address_id ?? null,
                currency: b.currency ?? null, payment_terms: b.payment_terms ?? null,
                payment_net_days: b.payment_net_days ?? null,
                clear_net_days: b.payment_net_days === null,
                scheduled_ship_date: b.scheduled_ship_date ?? null,
                clear_ship_date: b.scheduled_ship_date === null,
                notes: b.notes ?? null,
            }, fastify.db)
            return { id: rows[0].id }
        },
    })

    fastify.post('/orders/:id/submit', {
        preHandler: [fastify.authenticate, authorizeRole(['manager', 'sales'])],
        schema: { params: IdParam },
        handler: async (request, reply) => {
            const rows = await submitCustomerOrder.run({ id: request.params.id }, fastify.db)
            if (rows.length === 0) return reply.status(409).send({ error: 'Conflict', message: 'Order must be draft' })
            return { id: rows[0].id }
        },
    })

    fastify.post('/orders/:id/approve', {
        preHandler: [fastify.authenticate, authorizeRole(['manager'])],
        schema: { params: IdParam },
        handler: async (request, reply) => {
            const u = request.user as any
            const rows = await approveCustomerOrder.run({ id: request.params.id, user_id: u.id }, fastify.db)
            if (rows.length === 0) return reply.status(409).send({ error: 'Conflict', message: 'Order must be pending_approval' })
            return { id: rows[0].id }
        },
    })

    fastify.post('/orders/:id/cancel', {
        preHandler: [fastify.authenticate, authorizeRole(['manager', 'sales'])],
        schema: { params: IdParam },
        handler: async (request, reply) => {
            const u = request.user as any
            const cur = await getCustomerOrderStatus.run({ id: request.params.id }, fastify.db)
            if (cur.length === 0) return reply.status(404).send({ error: 'Not Found', message: 'Order not found' })
            const s = cur[0].status as string
            if (['cancelled', 'completed', 'shipped'].includes(s)) {
                return reply.status(409).send({ error: 'Conflict', message: `Cannot cancel order in status ${s}` })
            }
            if (['in_production', 'ready_for_shipment'].includes(s) && u.role !== 'manager') {
                return reply.status(403).send({ error: 'Forbidden', message: 'Cancelling after production started requires Manager approval' })
            }
            const rows = await cancelCustomerOrder.run({ id: request.params.id }, fastify.db)
            return { id: rows[0].id }
        },
    })

    fastify.post('/orders/:id/confirmation', {
        preHandler: [fastify.authenticate, authorizeRole(['manager', 'sales'])],
        schema: { params: IdParam },
        handler: async (request, reply) => {
            const u = request.user as any
            const id = request.params.id
            try {
                const result = await withTransaction(fastify.db, async (tx) => {
                    const o = await getOrderForConfirmation.run({ id }, tx)
                    if (o.length === 0) throw Object.assign(new Error('Order not found'), { statusCode: 404 })
                    const items = await getOrderItemsForConfirmation.run({ order_id: id }, tx)
                    const verRow = await nextConfirmationVersion.run({ order_id: id }, tx)
                    const version = Number(verRow[0].max) + 1
                    const order = o[0]
                    const total = items.reduce((s: number, it: any) =>
                        s + Number(it.quantity) * Number(it.negotiated_price_per_pack), 0)
                    const payload = {
                        order_id: id, version,
                        customer:           { name: order.customer_name, gst_number: order.gst_number },
                        shipping_address:   { label: order.shipping_label, address: order.shipping_address },
                        payment_terms:      order.payment_terms,
                        payment_net_days:   order.payment_net_days,
                        scheduled_ship_date: order.scheduled_ship_date,
                        due_date:           order.due_date,
                        currency:           order.currency,
                        items: items.map((it: any) => ({
                            paint_name: it.paint_name, hsn_code: it.hsn_code, product_code: it.product_code,
                            classification: it.classification, ink_series: it.ink_series,
                            pack_size_kg: it.pack_size_kg, quantity: it.quantity,
                            negotiated_price_per_pack: it.negotiated_price_per_pack,
                            line_total: Number(it.quantity) * Number(it.negotiated_price_per_pack),
                        })),
                        total,
                    }
                    const [conf] = await insertOrderConfirmation.run({
                        order_id: id, version, payload: JSON.stringify(payload), user_id: u.id,
                    }, tx)
                    return { conf, payload }
                })
                return { confirmation: result.conf, payload: result.payload }
            } catch (err: any) {
                if (err.statusCode === 404) return reply.status(404).send({ error: 'Not Found', message: err.message })
                fastify.log.error(err)
                return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to generate confirmation' })
            }
        },
    })

    fastify.get('/orders/:id/cost-to-build', {
        preHandler: [fastify.authenticate, authorizeRole(['manager', 'sales'])],
        schema: { params: IdParam },
        handler: async (request, reply) => {
            const items = await listOrderItemsForCost.run({ order_id: request.params.id }, fastify.db)
            if (items.length === 0) return reply.status(404).send({ error: 'Not Found', message: 'No items found' })
            const out = []
            for (const it of items) {
                const cost = await computeCostToBuild(fastify.db, it.variant_id, Number(it.pack_size_kg))
                out.push({ ...it, cost_to_build_per_pack: cost, line_cost: cost ? Number(it.quantity) * cost : null })
            }
            return out
        },
    })

    // sale + payments

    fastify.post('/orders/:id/sale', {
        preHandler: [fastify.authenticate, authorizeRole(['manager', 'sales'])],
        schema: { params: IdParam, body: CreateSaleBody },
        handler: async (request, reply) => {
            const u = request.user as any
            const orderId = request.params.id
            const b = request.body
            try {
                const saleId = await withTransaction(fastify.db, async (tx) => {
                    const order = await lockCustomerOrderForSale.run({ id: orderId }, tx)
                    if (order.length === 0) throw Object.assign(new Error('Order not found'), { statusCode: 404 })
                    if (!['approved', 'in_production', 'ready_for_shipment', 'shipped'].includes(order[0].status as string)) {
                        throw Object.assign(new Error('Order must be approved (or further) to log a sale'), { statusCode: 409 })
                    }
                    const [sale] = await insertSale.run({
                        order_id: orderId, customer_id: order[0].customer_id,
                        currency: order[0].currency, due_date: order[0].due_date,
                        notes: b.notes ?? null, user_id: u.id,
                    }, tx)
                    for (const li of b.items) {
                        const ord = await getOrderItemForSale.run({ id: li.order_item_id, order_id: orderId }, tx)
                        if (ord.length === 0) throw Object.assign(new Error(`Order item ${li.order_item_id} not on this order`), { statusCode: 400 })
                        const price = li.price_per_pack ?? Number(ord[0].negotiated_price_per_pack)
                        const [si] = await insertSaleItem.run({
                            sale_id: sale.id, order_item_id: li.order_item_id,
                            variant_id: li.variant_id, pack_size_kg: li.pack_size_kg as any,
                            quantity: li.quantity, price_per_pack: price as any,
                            cost_per_pack: ord[0].cost_to_build_per_pack as any,
                        }, tx)
                        if (li.pack_ids && li.pack_ids.length > 0) {
                            if (li.pack_ids.length !== li.quantity) {
                                throw Object.assign(new Error(`Provided ${li.pack_ids.length} pack_ids but quantity is ${li.quantity}`), { statusCode: 400 })
                            }
                            for (const packId of li.pack_ids) {
                                const claim = await claimPackForSale.run({
                                    pack_id: packId, variant_id: li.variant_id, pack_size_kg: li.pack_size_kg as any,
                                }, tx)
                                if (claim.length === 0) throw Object.assign(new Error(`Pack ${packId} not available for this sale line`), { statusCode: 409 })
                                await linkPackToSaleItem.run({ sale_item_id: si.id, pack_id: packId }, tx)
                            }
                        }
                    }
                    return sale.id
                })
                return reply.status(201).send({ id: saleId })
            } catch (err: any) {
                if (err.statusCode === 404) return reply.status(404).send({ error: 'Not Found', message: err.message })
                if (err.statusCode === 409) return reply.status(409).send({ error: 'Conflict', message: err.message })
                if (err.statusCode === 400) return reply.status(400).send({ error: 'Bad Request', message: err.message })
                if (err.code === '23505') return reply.status(409).send({ error: 'Conflict', message: 'Pack already assigned to another sale' })
                fastify.log.error(err)
                return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to log sale' })
            }
        },
    })

    fastify.get('/transactions', {
        preHandler: [fastify.authenticate, authorizeRole(['manager', 'sales', 'operator'])],
        handler: async (request) => {
            const u = request.user as any
            const rows = await listSales.run({ owner_id: u.role === 'manager' ? null : u.id }, fastify.db)
            return rows.map((r: any) => ({ ...r, payment_status: derivePaymentStatus(r.billed, r.collected) }))
        },
    })

    fastify.get('/transactions/:id', {
        preHandler: [fastify.authenticate, authorizeRole(['manager', 'sales', 'operator'])],
        schema: { params: IdParam },
        handler: async (request, reply) => {
            const u = request.user as any
            const rows = await getSale.run({ id: request.params.id }, fastify.db)
            if (rows.length === 0) return reply.status(404).send({ error: 'Not Found', message: 'Sale not found' })
            const sale: any = rows[0]
            if (u.role !== 'manager' && sale.created_by !== u.id) {
                sale.items = sale.items.map((it: any) => ({ ...it, price_per_pack: null, cost_per_pack: null }))
                sale.payments = []
                sale.billed = null; sale.collected = null; sale.payment_status = null
            } else {
                sale.payment_status = derivePaymentStatus(sale.billed, sale.collected)
            }
            return sale
        },
    })

    fastify.post('/transactions/:id/payments', {
        preHandler: [fastify.authenticate, authorizeRole(['manager', 'sales'])],
        schema: { params: IdParam, body: CreatePaymentBody },
        handler: async (request, reply) => {
            const u = request.user as any
            const b = request.body
            try {
                const [p] = await insertPayment.run({
                    sale_id: request.params.id, amount: b.amount as any,
                    currency: b.currency, date_received: b.date_received, method: b.method,
                    reference_number: b.reference_number ?? null,
                    receiving_account: b.receiving_account ?? null,
                    attachment_url: b.attachment_url ?? null,
                    notes: b.notes ?? null, user_id: u.id,
                }, fastify.db)
                return reply.status(201).send({ id: p.id })
            } catch (err: any) {
                if (err.code === '23503') return reply.status(404).send({ error: 'Not Found', message: 'Sale not found' })
                fastify.log.error(err)
                return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to record payment' })
            }
        },
    })

    // returns + refunds

    fastify.post('/transactions/:saleId/returns', {
        preHandler: [fastify.authenticate, authorizeRole(['manager'])],
        schema: { params: SaleIdParam, body: CreateReturnBody },
        handler: async (request, reply) => {
            const u = request.user as any
            const saleId = request.params.saleId
            const b = request.body
            try {
                const result = await withTransaction(fastify.db, async (tx) => {
                    const sale = await getSaleForReturn.run({ id: saleId }, tx)
                    if (sale.length === 0) throw Object.assign(new Error('Sale not found'), { statusCode: 404 })
                    const [ret] = await insertReturn.run({
                        sale_id: saleId, customer_id: sale[0].customer_id,
                        notes: b.notes ?? null, user_id: u.id,
                    }, tx)
                    for (const ri of b.items) {
                        await insertReturnItem.run({
                            return_id: ret.id, sale_item_id: ri.sale_item_id,
                            pack_id: ri.pack_id ?? null, condition: ri.condition,
                            disposition: ri.disposition, notes: ri.notes ?? null,
                        }, tx)
                        if (ri.pack_id) {
                            if (ri.disposition === 're_inventory') await setPackReadyAfterReturn.run({ pack_id: ri.pack_id }, tx)
                            else                                   await setPackLostAfterReturn.run({ pack_id: ri.pack_id }, tx)
                        }
                    }
                    let refundId: number | null = null
                    if (b.refund_amount !== undefined && b.refund_amount > 0) {
                        const refundCurrency = b.refund_currency ?? sale[0].currency
                        const [ref] = await insertRefund.run({
                            return_id: ret.id, amount: b.refund_amount as any,
                            currency: refundCurrency, user_id: u.id,
                        }, tx)
                        refundId = ref.id
                    }
                    return { returnId: ret.id, refundId }
                })
                return reply.status(201).send({ return_id: result.returnId, refund_id: result.refundId })
            } catch (err: any) {
                if (err.statusCode === 404) return reply.status(404).send({ error: 'Not Found', message: err.message })
                fastify.log.error(err)
                return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to record return' })
            }
        },
    })

    fastify.post('/refunds/:id/approve', {
        preHandler: [fastify.authenticate, authorizeRole(['manager'])],
        schema: { params: IdParam },
        handler: async (request, reply) => {
            const u = request.user as any
            const rows = await approveRefund.run({ id: request.params.id, user_id: u.id }, fastify.db)
            if (rows.length === 0) return reply.status(409).send({ error: 'Conflict', message: 'Refund not in pending_approval' })
            return { id: rows[0].id }
        },
    })

    fastify.post('/refunds/:id/reject', {
        preHandler: [fastify.authenticate, authorizeRole(['manager'])],
        schema: { params: IdParam, body: RejectRefundBody },
        handler: async (request, reply) => {
            const rows = await rejectRefund.run({ id: request.params.id, reason: request.body.reason }, fastify.db)
            if (rows.length === 0) return reply.status(409).send({ error: 'Conflict', message: 'Refund not in pending_approval' })
            return { id: rows[0].id }
        },
    })

    fastify.post('/refunds/:id/payouts', {
        preHandler: [fastify.authenticate, authorizeRole(['manager'])],
        schema: { params: IdParam, body: RefundPayoutBody },
        handler: async (request, reply) => {
            const u = request.user as any
            const refundId = request.params.id
            const b = request.body
            try {
                await withTransaction(fastify.db, async (tx) => {
                    const ref = await lockRefundForPayout.run({ id: refundId }, tx)
                    if (ref.length === 0) throw Object.assign(new Error('Refund not found'), { statusCode: 404 })
                    if (!['approved', 'paid_out'].includes(ref[0].status as string)) {
                        throw Object.assign(new Error('Refund must be approved before payout'), { statusCode: 409 })
                    }
                    await insertRefundPayout.run({
                        refund_id: refundId, amount: b.amount as any, currency: b.currency,
                        date_paid: b.date_paid, method: b.method,
                        reference_number: b.reference_number ?? null,
                        paying_account: b.paying_account ?? null,
                        attachment_url: b.attachment_url ?? null,
                        notes: b.notes ?? null, user_id: u.id,
                    }, tx)
                    const tot = await sumRefundPayouts.run({ refund_id: refundId }, tx)
                    if (Math.abs(Number(tot[0].sum) - Number(ref[0].amount)) < 0.01) {
                        await markRefundPaidOut.run({ id: refundId }, tx)
                    }
                })
                return reply.status(201).send({ refund_id: refundId })
            } catch (err: any) {
                if (err.statusCode === 404) return reply.status(404).send({ error: 'Not Found', message: err.message })
                if (err.statusCode === 409) return reply.status(409).send({ error: 'Conflict', message: err.message })
                fastify.log.error(err)
                return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to record payout' })
            }
        },
    })
}
