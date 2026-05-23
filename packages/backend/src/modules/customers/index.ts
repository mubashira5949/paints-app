/**
 * Customers module (spec §2.1).
 */

import { FastifyInstance } from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'
import { authorizeRole } from '../../utils/authorizeRole'
import { withTransaction } from '../../utils/withTransaction'
import {
    listCustomers, getCustomer, insertCustomer, patchCustomer,
    archiveCustomer, restoreCustomer,
    customerExists, clearDefaultShippingAddress,
    insertShippingAddress, getShippingAddressCustomer,
    patchShippingAddress, deleteShippingAddress,
} from '../../queries'

const IdParam   = Type.Object({ id:     Type.Integer({ minimum: 1 }) })
const AddrParam = Type.Object({ addrId: Type.Integer({ minimum: 1 }) })
const Currency  = Type.String({ pattern: '^[A-Z]{3}$', maxLength: 3 })

const CreateBody = Type.Object({
    name:             Type.String({ minLength: 1, maxLength: 255 }),
    contact_name:     Type.Optional(Type.String({ maxLength: 255 })),
    contact_phone:    Type.Optional(Type.String({ maxLength: 50 })),
    contact_email:    Type.Optional(Type.String({ format: 'email', maxLength: 255 })),
    billing_address:  Type.Optional(Type.String()),
    gst_number:       Type.Optional(Type.String({ maxLength: 20 })),
    default_currency: Type.Optional(Currency),
    notes:            Type.Optional(Type.String()),
})

const PatchBody = Type.Object({
    name:             Type.Optional(Type.String({ minLength: 1, maxLength: 255 })),
    contact_name:     Type.Optional(Type.String({ maxLength: 255 })),
    contact_phone:    Type.Optional(Type.String({ maxLength: 50 })),
    contact_email:    Type.Optional(Type.String({ format: 'email', maxLength: 255 })),
    billing_address:  Type.Optional(Type.String()),
    gst_number:       Type.Optional(Type.Union([Type.String({ maxLength: 20 }), Type.Null()])),
    default_currency: Type.Optional(Currency),
    notes:            Type.Optional(Type.String()),
})

const ShippingAddressBody = Type.Object({
    label:      Type.String({ minLength: 1, maxLength: 100 }),
    address:    Type.String({ minLength: 1 }),
    is_default: Type.Optional(Type.Boolean()),
})

const PatchShippingAddressBody = Type.Object({
    label:      Type.Optional(Type.String({ minLength: 1, maxLength: 100 })),
    address:    Type.Optional(Type.String({ minLength: 1 })),
    is_default: Type.Optional(Type.Boolean()),
})

const ListQuery = Type.Object({
    page:             Type.Optional(Type.Integer({ minimum: 1 })),
    page_size:        Type.Optional(Type.Integer({ minimum: 1, maximum: 100 })),
    search:           Type.Optional(Type.String({ maxLength: 100 })),
    include_archived: Type.Optional(Type.Boolean()),
})

export default async function (fastifyRaw: FastifyInstance) {
    const fastify = fastifyRaw.withTypeProvider<TypeBoxTypeProvider>()

    fastify.get('/', {
        preHandler: [fastify.authenticate],
        schema: { querystring: ListQuery },
        handler: async (request) => {
            const q = request.query
            const page = q.page ?? 1
            const page_size = q.page_size ?? 20
            const rows = await listCustomers.run({
                page_size, page_offset: (page - 1) * page_size,
                search:           q.search ? `%${q.search}%` : null,
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
            const rows = await getCustomer.run({ id: request.params.id }, fastify.db)
            if (rows.length === 0) return reply.status(404).send({ error: 'Not Found', message: 'Customer not found' })
            return rows[0]
        },
    })

    fastify.post('/', {
        preHandler: [fastify.authenticate, authorizeRole(['manager', 'sales'])],
        schema: { body: CreateBody },
        handler: async (request, reply) => {
            const user = request.user as any
            const b = request.body
            try {
                const [r] = await insertCustomer.run({
                    name: b.name, contact_name: b.contact_name ?? null,
                    contact_phone: b.contact_phone ?? null, contact_email: b.contact_email ?? null,
                    billing_address: b.billing_address ?? null, gst_number: b.gst_number ?? null,
                    default_currency: b.default_currency ?? null, notes: b.notes ?? null,
                    created_by: user.id,
                }, fastify.db)
                return reply.status(201).send({ id: r.id })
            } catch (err: any) {
                if (err.code === '23505') return reply.status(409).send({ error: 'Conflict', message: 'GST number already in use' })
                fastify.log.error(err)
                return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to create customer' })
            }
        },
    })

    fastify.patch('/:id', {
        preHandler: [fastify.authenticate, authorizeRole(['manager', 'sales'])],
        schema: { params: IdParam, body: PatchBody },
        handler: async (request, reply) => {
            const b = request.body
            if (!b.name && !b.contact_name && !b.contact_phone && !b.contact_email
                && !b.billing_address && b.gst_number === undefined
                && !b.default_currency && !b.notes) {
                return reply.status(400).send({ error: 'Bad Request', message: 'No fields to update' })
            }
            try {
                const rows = await patchCustomer.run({
                    id: request.params.id,
                    name: b.name ?? null, contact_name: b.contact_name ?? null,
                    contact_phone: b.contact_phone ?? null, contact_email: b.contact_email ?? null,
                    billing_address: b.billing_address ?? null,
                    gst_number: b.gst_number ?? null,
                    clear_gst: b.gst_number === null,
                    default_currency: b.default_currency ?? null,
                    notes: b.notes ?? null,
                }, fastify.db)
                if (rows.length === 0) return reply.status(404).send({ error: 'Not Found', message: 'Customer not found' })
                return { id: rows[0].id }
            } catch (err: any) {
                if (err.code === '23505') return reply.status(409).send({ error: 'Conflict', message: 'GST number already in use' })
                fastify.log.error(err)
                return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to update customer' })
            }
        },
    })

    fastify.post('/:id/archive', {
        preHandler: [fastify.authenticate, authorizeRole(['manager'])],
        schema: { params: IdParam },
        handler: async (request, reply) => {
            const user = request.user as any
            const rows = await archiveCustomer.run({ id: request.params.id, user_id: user.id }, fastify.db)
            if (rows.length === 0) return reply.status(404).send({ error: 'Not Found', message: 'Customer not found or already archived' })
            return { id: rows[0].id }
        },
    })

    fastify.post('/:id/restore', {
        preHandler: [fastify.authenticate, authorizeRole(['manager'])],
        schema: { params: IdParam },
        handler: async (request, reply) => {
            const rows = await restoreCustomer.run({ id: request.params.id }, fastify.db)
            if (rows.length === 0) return reply.status(404).send({ error: 'Not Found', message: 'Customer not found' })
            return { id: rows[0].id }
        },
    })

    // shipping addresses

    fastify.post('/:id/shipping-addresses', {
        preHandler: [fastify.authenticate, authorizeRole(['manager', 'sales'])],
        schema: { params: IdParam, body: ShippingAddressBody },
        handler: async (request, reply) => {
            const customerId = request.params.id
            const b = request.body
            try {
                const id = await withTransaction(fastify.db, async (tx) => {
                    const exists = await customerExists.run({ id: customerId }, tx)
                    if (exists.length === 0) throw Object.assign(new Error('Customer not found'), { statusCode: 404 })
                    if (b.is_default) await clearDefaultShippingAddress.run({ customer_id: customerId }, tx)
                    const [row] = await insertShippingAddress.run({
                        customer_id: customerId, label: b.label, address: b.address,
                        is_default: b.is_default ?? null,
                    }, tx)
                    return row.id
                })
                return reply.status(201).send({ id })
            } catch (err: any) {
                if (err.statusCode === 404) return reply.status(404).send({ error: 'Not Found', message: err.message })
                fastify.log.error(err)
                return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to add shipping address' })
            }
        },
    })

    fastify.patch('/shipping-addresses/:addrId', {
        preHandler: [fastify.authenticate, authorizeRole(['manager', 'sales'])],
        schema: { params: AddrParam, body: PatchShippingAddressBody },
        handler: async (request, reply) => {
            const addrId = request.params.addrId
            const b = request.body
            try {
                await withTransaction(fastify.db, async (tx) => {
                    const cur = await getShippingAddressCustomer.run({ id: addrId }, tx)
                    if (cur.length === 0) throw Object.assign(new Error('Shipping address not found'), { statusCode: 404 })
                    if (b.is_default) await clearDefaultShippingAddress.run({ customer_id: cur[0].customer_id }, tx)
                    if (b.label !== undefined || b.address !== undefined || b.is_default !== undefined) {
                        await patchShippingAddress.run({
                            id: addrId,
                            label: b.label ?? null, address: b.address ?? null,
                            is_default: b.is_default ?? null,
                        }, tx)
                    }
                })
                return { id: addrId }
            } catch (err: any) {
                if (err.statusCode === 404) return reply.status(404).send({ error: 'Not Found', message: err.message })
                fastify.log.error(err)
                return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to update shipping address' })
            }
        },
    })

    fastify.delete('/shipping-addresses/:addrId', {
        preHandler: [fastify.authenticate, authorizeRole(['manager', 'sales'])],
        schema: { params: AddrParam },
        handler: async (request, reply) => {
            const rows = await deleteShippingAddress.run({ id: request.params.addrId }, fastify.db)
            if (rows.length === 0) return reply.status(404).send({ error: 'Not Found', message: 'Shipping address not found' })
            return { id: rows[0].id }
        },
    })
}
