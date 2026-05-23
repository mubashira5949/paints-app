/**
 * Suppliers module (spec §2.1 + §3.2).
 */

import { FastifyInstance } from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'
import { authorizeRole } from '../../utils/authorizeRole'
import {
    listSuppliers, getSupplier, insertSupplier, patchSupplier,
    archiveSupplier, restoreSupplier,
} from '../../queries'

const IdParam = Type.Object({ id: Type.Integer({ minimum: 1 }) })

const PocItem = Type.Object({
    name:  Type.String({ minLength: 1, maxLength: 255 }),
    email: Type.Optional(Type.String({ format: 'email', maxLength: 255 })),
    phone: Type.Optional(Type.String({ maxLength: 50 })),
    role:  Type.Optional(Type.String({ maxLength: 100 })),
})

const CreateBody = Type.Object({
    name:         Type.String({ minLength: 1, maxLength: 255 }),
    contact_name: Type.Optional(Type.String({ maxLength: 255 })),
    email:        Type.Optional(Type.String({ format: 'email', maxLength: 255 })),
    phone:        Type.Optional(Type.String({ maxLength: 50 })),
    address:      Type.Optional(Type.String()),
    website:      Type.Optional(Type.String({ maxLength: 255 })),
    gst_number:   Type.Optional(Type.String({ maxLength: 20 })),
    pocs:         Type.Optional(Type.Array(PocItem, { maxItems: 32 })),
    notes:        Type.Optional(Type.String()),
})

const PatchBody = Type.Object({
    name:         Type.Optional(Type.String({ minLength: 1, maxLength: 255 })),
    contact_name: Type.Optional(Type.String({ maxLength: 255 })),
    email:        Type.Optional(Type.String({ format: 'email', maxLength: 255 })),
    phone:        Type.Optional(Type.String({ maxLength: 50 })),
    address:      Type.Optional(Type.String()),
    website:      Type.Optional(Type.String({ maxLength: 255 })),
    gst_number:   Type.Optional(Type.String({ maxLength: 20 })),
    pocs:         Type.Optional(Type.Array(PocItem, { maxItems: 32 })),
    notes:        Type.Optional(Type.String()),
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
            const rows = await listSuppliers.run({
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
            const rows = await getSupplier.run({ id: request.params.id }, fastify.db)
            if (rows.length === 0) return reply.status(404).send({ error: 'Not Found', message: 'Supplier not found' })
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
                const [r] = await insertSupplier.run({
                    name: b.name, contact_name: b.contact_name ?? null,
                    email: b.email ?? null, phone: b.phone ?? null,
                    address: b.address ?? null, website: b.website ?? null,
                    gst_number: b.gst_number ?? null,
                    pocs: b.pocs ? JSON.stringify(b.pocs) : null,
                    notes: b.notes ?? null,
                    created_by: user.id,
                }, fastify.db)
                return reply.status(201).send({ id: r.id })
            } catch (err: any) {
                if (err.code === '23505') return reply.status(409).send({ error: 'Conflict', message: 'Supplier name must be unique' })
                fastify.log.error(err)
                return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to create supplier' })
            }
        },
    })

    fastify.patch('/:id', {
        preHandler: [fastify.authenticate, authorizeRole(['manager', 'sales'])],
        schema: { params: IdParam, body: PatchBody },
        handler: async (request, reply) => {
            const b = request.body
            const hasField = b.name !== undefined || b.contact_name !== undefined || b.email !== undefined
                || b.phone !== undefined || b.address !== undefined || b.website !== undefined
                || b.gst_number !== undefined || b.pocs !== undefined || b.notes !== undefined
            if (!hasField) return reply.status(400).send({ error: 'Bad Request', message: 'No fields to update' })
            try {
                const rows = await patchSupplier.run({
                    id: request.params.id,
                    name: b.name ?? null, contact_name: b.contact_name ?? null,
                    email: b.email ?? null, phone: b.phone ?? null,
                    address: b.address ?? null, website: b.website ?? null,
                    gst_number: b.gst_number ?? null,
                    pocs: b.pocs ? JSON.stringify(b.pocs) : null,
                    notes: b.notes ?? null,
                }, fastify.db)
                if (rows.length === 0) return reply.status(404).send({ error: 'Not Found', message: 'Supplier not found' })
                return { id: rows[0].id }
            } catch (err: any) {
                if (err.code === '23505') return reply.status(409).send({ error: 'Conflict', message: 'Supplier name must be unique' })
                fastify.log.error(err)
                return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to update supplier' })
            }
        },
    })

    fastify.post('/:id/archive', {
        preHandler: [fastify.authenticate, authorizeRole(['manager'])],
        schema: { params: IdParam },
        handler: async (request, reply) => {
            const user = request.user as any
            const rows = await archiveSupplier.run({ id: request.params.id, user_id: user.id }, fastify.db)
            if (rows.length === 0) return reply.status(404).send({ error: 'Not Found', message: 'Supplier not found or already archived' })
            return { id: rows[0].id }
        },
    })

    fastify.post('/:id/restore', {
        preHandler: [fastify.authenticate, authorizeRole(['manager'])],
        schema: { params: IdParam },
        handler: async (request, reply) => {
            const rows = await restoreSupplier.run({ id: request.params.id }, fastify.db)
            if (rows.length === 0) return reply.status(404).send({ error: 'Not Found', message: 'Supplier not found' })
            return { id: rows[0].id }
        },
    })
}
