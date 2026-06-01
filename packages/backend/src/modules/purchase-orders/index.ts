/**
 * Supplier Purchase Orders (spec §3.2).
 *
 * Status flow: draft → ordered → shipped → received (or cancelled). On
 * receive, resource lines insert into resource_stock_transactions (DDL
 * trigger maintains weighted-avg cost), finished_paint lines insert
 * supplier-source rows into finished_paint_packs.
 */

import { FastifyInstance } from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'
import { authorizeRole } from '../../utils/authorizeRole'
import { withTransaction } from '../../utils/withTransaction'
import {
    listPurchaseOrders, getPurchaseOrder, insertPurchaseOrder, insertPurchaseOrderItem,
    patchPurchaseOrder, getPoItemForEdit, patchPurchaseOrderItem, deletePurchaseOrderItem,
    getPurchaseOrderStatus, setPurchaseOrderStatus,
    lockPurchaseOrderForReceive, lockPoItemForReceive,
    insertResourceReceipt, bumpReceivedQuantityKg,
    insertSupplierFinishedPack, bumpReceivedPacks,
    countPendingPoItems, markPurchaseOrderReceived,
    archivePurchaseOrder, restorePurchaseOrder,
} from '../../queries'

const IdParam     = Type.Object({ id:     Type.Integer({ minimum: 1 }) })
const ItemIdParam = Type.Object({ itemId: Type.Integer({ minimum: 1 }) })

const Currency = Type.String({ pattern: '^[A-Z]{3}$', maxLength: 3 })
const Kind = Type.Union([Type.Literal('resource'), Type.Literal('finished_paint')])

const POItemInput = Type.Object({
    kind:               Kind,
    resource_id:        Type.Optional(Type.Integer({ minimum: 1 })),
    variant_id:         Type.Optional(Type.Integer({ minimum: 1 })),
    pack_size_kg:       Type.Optional(Type.Number({ exclusiveMinimum: 0 })),
    quantity_kg:        Type.Optional(Type.Number({ exclusiveMinimum: 0 })),
    quantity_packs:     Type.Optional(Type.Integer({ exclusiveMinimum: 0 })),
    landed_cost_per_kg: Type.Number({ minimum: 0 }),
})

const CreateBody = Type.Object({
    supplier_id: Type.Integer({ minimum: 1 }),
    currency:    Type.Optional(Currency),
    notes:       Type.Optional(Type.String()),
    items:       Type.Array(POItemInput, { minItems: 1, maxItems: 200 }),
})

const PatchHeaderBody = Type.Object({
    currency: Type.Optional(Currency),
    notes:    Type.Optional(Type.String()),
})

const PatchItemBody = Type.Object({
    pack_size_kg:       Type.Optional(Type.Number({ exclusiveMinimum: 0 })),
    quantity_kg:        Type.Optional(Type.Number({ exclusiveMinimum: 0 })),
    quantity_packs:     Type.Optional(Type.Integer({ exclusiveMinimum: 0 })),
    landed_cost_per_kg: Type.Optional(Type.Number({ minimum: 0 })),
})

const TransitionBody = Type.Object({
    to: Type.Union([Type.Literal('ordered'), Type.Literal('shipped'), Type.Literal('cancelled')]),
})

const ReceiveBody = Type.Object({
    items: Type.Array(Type.Object({
        id:                  Type.Integer({ minimum: 1 }),
        received_quantity_kg: Type.Optional(Type.Number({ exclusiveMinimum: 0 })),
        received_packs:       Type.Optional(Type.Integer({ exclusiveMinimum: 0 })),
    }), { minItems: 1, maxItems: 200 }),
})

const ListQuery = Type.Object({
    page:        Type.Optional(Type.Integer({ minimum: 1 })),
    page_size:   Type.Optional(Type.Integer({ minimum: 1, maximum: 100 })),
    status:      Type.Optional(Type.Union([
        Type.Literal('draft'), Type.Literal('ordered'),
        Type.Literal('shipped'), Type.Literal('received'),
        Type.Literal('cancelled'),
    ])),
    supplier_id:      Type.Optional(Type.Integer({ minimum: 1 })),
    include_archived: Type.Optional(Type.Boolean()),
})

const FORWARD: Record<string, ReadonlyArray<string>> = {
    draft:     ['ordered',   'cancelled'],
    ordered:   ['shipped',   'cancelled'],
    shipped:   ['received',  'cancelled'],
    received:  [],
    cancelled: [],
}

function validateItem(item: any): void {
    if (item.kind === 'resource') {
        if (!item.resource_id || !item.quantity_kg || item.quantity_kg <= 0) {
            throw Object.assign(new Error('Resource line requires resource_id + quantity_kg > 0'), { statusCode: 400 })
        }
    } else {
        if (!item.variant_id || !item.pack_size_kg || !item.quantity_packs || item.pack_size_kg <= 0 || item.quantity_packs <= 0) {
            throw Object.assign(new Error('Finished-paint line requires variant_id, pack_size_kg > 0, quantity_packs > 0'), { statusCode: 400 })
        }
    }
}

export default async function (fastifyRaw: FastifyInstance) {
    const fastify = fastifyRaw.withTypeProvider<TypeBoxTypeProvider>()

    fastify.get('/', {
        preHandler: [fastify.authenticate],
        schema: { querystring: ListQuery },
        handler: async (request) => {
            const q = request.query
            const page = q.page ?? 1
            const page_size = q.page_size ?? 20
            const rows = await listPurchaseOrders.run({
                page_size, page_offset: (page - 1) * page_size,
                status:           (q.status ?? null) as any,
                supplier_id:      q.supplier_id ?? null,
                include_archived: q.include_archived ?? null,
            }, fastify.db)
            const total = rows[0]?._total ? Number(rows[0]._total) : 0
            return { items: rows.map(({ _total, ...r }) => r), total, page, page_size }
        },
    })

    fastify.get('/:id', {
        preHandler: [fastify.authenticate],
        schema: { params: IdParam },
        handler: async (request, reply) => {
            const rows = await getPurchaseOrder.run({ id: request.params.id }, fastify.db)
            if (rows.length === 0) return reply.status(404).send({ error: 'Not Found', message: 'Purchase order not found' })
            return rows[0]
        },
    })

    fastify.post('/', {
        preHandler: [fastify.authenticate, authorizeRole(['manager'])],
        schema: { body: CreateBody },
        handler: async (request, reply) => {
            const user = request.user as any
            const b = request.body
            try {
                const id = await withTransaction(fastify.db, async (tx) => {
                    const [po] = await insertPurchaseOrder.run({
                        supplier_id: b.supplier_id, currency: b.currency ?? null, notes: b.notes ?? null, user_id: user.id,
                    }, tx)
                    for (const item of b.items) {
                        validateItem(item)
                        await insertPurchaseOrderItem.run({
                            po_id: po.id, kind: item.kind,
                            resource_id: item.resource_id ?? null, variant_id: item.variant_id ?? null,
                            pack_size_kg: (item.pack_size_kg ?? null) as any,
                            quantity_kg: (item.quantity_kg ?? null) as any,
                            quantity_packs: item.quantity_packs ?? null,
                            landed_cost_per_kg: item.landed_cost_per_kg as any,
                        }, tx)
                    }
                    return po.id
                })
                return reply.status(201).send({ id })
            } catch (err: any) {
                if (err.statusCode === 400) return reply.status(400).send({ error: 'Bad Request', message: err.message })
                if (err.code === '23503') return reply.status(400).send({ error: 'Bad Request', message: 'Unknown supplier/resource/variant id' })
                fastify.log.error(err)
                return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to create PO' })
            }
        },
    })

    fastify.patch('/:id', {
        preHandler: [fastify.authenticate, authorizeRole(['manager'])],
        schema: { params: IdParam, body: PatchHeaderBody },
        handler: async (request, reply) => {
            const b = request.body
            if (b.currency === undefined && b.notes === undefined) {
                return reply.status(400).send({ error: 'Bad Request', message: 'No fields to update' })
            }
            const rows = await patchPurchaseOrder.run({
                id: request.params.id, currency: b.currency ?? null, notes: b.notes ?? null,
            }, fastify.db)
            if (rows.length === 0) return reply.status(404).send({ error: 'Not Found', message: 'PO not found' })
            return { id: rows[0].id }
        },
    })

    fastify.post('/:id/items', {
        preHandler: [fastify.authenticate, authorizeRole(['manager'])],
        schema: { params: IdParam, body: POItemInput },
        handler: async (request, reply) => {
            const id = request.params.id
            const item = request.body
            try {
                validateItem(item)
                const status = await getPurchaseOrderStatus.run({ id }, fastify.db)
                if (status.length === 0) return reply.status(404).send({ error: 'Not Found', message: 'PO not found' })
                if (status[0].status !== 'draft') return reply.status(409).send({ error: 'Conflict', message: 'PO items can only be added while draft' })
                const [r] = await insertPurchaseOrderItem.run({
                    po_id: id, kind: item.kind,
                    resource_id: item.resource_id ?? null, variant_id: item.variant_id ?? null,
                    pack_size_kg: (item.pack_size_kg ?? null) as any,
                    quantity_kg: (item.quantity_kg ?? null) as any,
                    quantity_packs: item.quantity_packs ?? null,
                    landed_cost_per_kg: item.landed_cost_per_kg as any,
                }, fastify.db)
                return reply.status(201).send({ id: r.id })
            } catch (err: any) {
                if (err.statusCode === 400) return reply.status(400).send({ error: 'Bad Request', message: err.message })
                if (err.code === '23503') return reply.status(400).send({ error: 'Bad Request', message: 'Unknown resource/variant id' })
                fastify.log.error(err)
                return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to add item' })
            }
        },
    })

    fastify.patch('/items/:itemId', {
        preHandler: [fastify.authenticate, authorizeRole(['manager'])],
        schema: { params: ItemIdParam, body: PatchItemBody },
        handler: async (request, reply) => {
            const itemId = request.params.itemId
            const b = request.body
            const cur = await getPoItemForEdit.run({ id: itemId }, fastify.db)
            if (cur.length === 0) return reply.status(404).send({ error: 'Not Found', message: 'Item not found' })
            if (cur[0].po_status !== 'draft') return reply.status(409).send({ error: 'Conflict', message: 'PO items are read-only after the PO leaves draft' })
            if (b.pack_size_kg === undefined && b.quantity_kg === undefined && b.quantity_packs === undefined && b.landed_cost_per_kg === undefined) {
                return reply.status(400).send({ error: 'Bad Request', message: 'No fields to update' })
            }
            const [r] = await patchPurchaseOrderItem.run({
                id: itemId,
                pack_size_kg: (b.pack_size_kg ?? null) as any,
                quantity_kg:  (b.quantity_kg ?? null) as any,
                quantity_packs: b.quantity_packs ?? null,
                landed_cost_per_kg: (b.landed_cost_per_kg ?? null) as any,
            }, fastify.db)
            return { id: r.id }
        },
    })

    fastify.delete('/items/:itemId', {
        preHandler: [fastify.authenticate, authorizeRole(['manager'])],
        schema: { params: ItemIdParam },
        handler: async (request, reply) => {
            const itemId = request.params.itemId
            const cur = await getPoItemForEdit.run({ id: itemId }, fastify.db)
            if (cur.length === 0) return reply.status(404).send({ error: 'Not Found', message: 'Item not found' })
            if (cur[0].po_status !== 'draft') return reply.status(409).send({ error: 'Conflict', message: 'PO items can only be removed while draft' })
            await deletePurchaseOrderItem.run({ id: itemId }, fastify.db)
            return { id: itemId }
        },
    })

    fastify.post('/:id/transition', {
        preHandler: [fastify.authenticate, authorizeRole(['manager'])],
        schema: { params: IdParam, body: TransitionBody },
        handler: async (request, reply) => {
            const id = request.params.id
            const to = request.body.to
            const cur = await getPurchaseOrderStatus.run({ id }, fastify.db)
            if (cur.length === 0) return reply.status(404).send({ error: 'Not Found', message: 'PO not found' })
            const from = cur[0].status as string
            if (!FORWARD[from]?.includes(to)) {
                return reply.status(409).send({ error: 'Conflict', message: `Cannot transition from ${from} to ${to}` })
            }
            await setPurchaseOrderStatus.run({
                id, status: to as any,
                stamp_ordered:  to === 'ordered',
                stamp_shipped:  to === 'shipped',
                stamp_received: false,
            }, fastify.db)
            return { id, status: to }
        },
    })

    fastify.post('/:id/receive', {
        preHandler: [fastify.authenticate, authorizeRole(['manager'])],
        schema: { params: IdParam, body: ReceiveBody },
        handler: async (request, reply) => {
            const user = request.user as any
            const id = request.params.id
            try {
                await withTransaction(fastify.db, async (tx) => {
                    const po = await lockPurchaseOrderForReceive.run({ id }, tx)
                    if (po.length === 0) throw Object.assign(new Error('PO not found'), { statusCode: 404 })
                    if (!['ordered', 'shipped'].includes(po[0].status as string)) {
                        throw Object.assign(new Error('PO must be ordered or shipped before receiving'), { statusCode: 409 })
                    }
                    for (const r of request.body.items) {
                        const li = await lockPoItemForReceive.run({ id: r.id, po_id: id }, tx)
                        if (li.length === 0) throw Object.assign(new Error(`Item ${r.id} not in PO ${id}`), { statusCode: 400 })
                        const item = li[0]
                        if (item.kind === 'resource') {
                            const remaining = Number(item.quantity_kg) - Number(item.received_quantity_kg)
                            const add = r.received_quantity_kg ?? remaining
                            if (add <= 0) continue
                            if (add > remaining + 1e-9) throw Object.assign(new Error(`Item ${r.id}: receive ${add}kg exceeds remaining ${remaining}kg`), { statusCode: 400 })
                            await insertResourceReceipt.run({
                                resource_id: item.resource_id!, quantity_kg: add as any,
                                unit_cost_per_kg: item.landed_cost_per_kg as any,
                                po_item_id: r.id, user_id: user.id,
                            }, tx)
                            await bumpReceivedQuantityKg.run({ id: r.id, delta: add as any }, tx)
                        } else {
                            const remaining = Number(item.quantity_packs) - Number(item.received_packs)
                            const add = r.received_packs ?? remaining
                            if (add <= 0) continue
                            if (add > remaining) throw Object.assign(new Error(`Item ${r.id}: receive ${add} packs exceeds remaining ${remaining}`), { statusCode: 400 })
                            for (let i = 0; i < add; i++) {
                                await insertSupplierFinishedPack.run({
                                    variant_id: item.variant_id!,
                                    pack_size_kg: item.pack_size_kg as any,
                                    po_item_id: r.id,
                                    cost_per_kg: item.landed_cost_per_kg as any,
                                }, tx)
                            }
                            await bumpReceivedPacks.run({ id: r.id, delta: add }, tx)
                        }
                    }
                    const pending = await countPendingPoItems.run({ po_id: id }, tx)
                    if (Number(pending[0].pending) === 0) await markPurchaseOrderReceived.run({ id }, tx)
                })
                return { id }
            } catch (err: any) {
                if (err.statusCode === 404) return reply.status(404).send({ error: 'Not Found', message: err.message })
                if (err.statusCode === 409) return reply.status(409).send({ error: 'Conflict', message: err.message })
                if (err.statusCode === 400) return reply.status(400).send({ error: 'Bad Request', message: err.message })
                fastify.log.error(err)
                return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to receive PO' })
            }
        },
    })

    fastify.post('/:id/archive', {
        preHandler: [fastify.authenticate, authorizeRole(['manager'])],
        schema: { params: IdParam },
        handler: async (request, reply) => {
            const user = request.user as any
            const rows = await archivePurchaseOrder.run({ id: request.params.id, user_id: user.id }, fastify.db)
            if (rows.length === 0) return reply.status(404).send({ error: 'Not Found', message: 'PO not found or already archived' })
            return { id: rows[0].id }
        },
    })

    fastify.post('/:id/restore', {
        preHandler: [fastify.authenticate, authorizeRole(['manager'])],
        schema: { params: IdParam },
        handler: async (request, reply) => {
            const rows = await restorePurchaseOrder.run({ id: request.params.id }, fastify.db)
            if (rows.length === 0) return reply.status(404).send({ error: 'Not Found', message: 'PO not found' })
            return { id: rows[0].id }
        },
    })
}
