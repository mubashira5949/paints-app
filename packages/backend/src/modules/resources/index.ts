/**
 * Resources module (spec §3.2).
 */

import { FastifyInstance } from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'
import { authorizeRole } from '../../utils/authorizeRole'
import {
    listResources, getResource, listResourceTransactionsRecent,
    insertResource, patchResource, archiveResource, restoreResource,
} from '../../queries'

const IdParam = Type.Object({ id: Type.Integer({ minimum: 1 }) })

const CreateBody = Type.Object({
    name:                   Type.String({ minLength: 1, maxLength: 255 }),
    description:            Type.Optional(Type.String()),
    aliases:                Type.Optional(Type.Array(Type.String({ maxLength: 100 }), { maxItems: 32 })),
    import_source:          Type.Optional(Type.String({ maxLength: 255 })),
    low_stock_threshold_kg: Type.Optional(Type.Number({ minimum: 0 })),
})

const PatchBody = Type.Object({
    name:                   Type.Optional(Type.String({ minLength: 1, maxLength: 255 })),
    description:            Type.Optional(Type.String()),
    aliases:                Type.Optional(Type.Array(Type.String({ maxLength: 100 }), { maxItems: 32 })),
    import_source:          Type.Optional(Type.String({ maxLength: 255 })),
    low_stock_threshold_kg: Type.Optional(Type.Union([Type.Number({ minimum: 0 }), Type.Null()])),
})

const ListQuery = Type.Object({
    page:             Type.Optional(Type.Integer({ minimum: 1 })),
    page_size:        Type.Optional(Type.Integer({ minimum: 1, maximum: 100 })),
    search:           Type.Optional(Type.String({ maxLength: 100 })),
    low_stock_only:   Type.Optional(Type.Boolean()),
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
            const rows = await listResources.run({
                page_size, page_offset: (page - 1) * page_size,
                search:           q.search ? `%${q.search}%` : null,
                search_exact:     q.search ?? null,
                include_archived: q.include_archived ?? null,
                low_stock_only:   q.low_stock_only ?? null,
            }, fastify.db)
            const total = rows[0]?._total ? Number(rows[0]._total) : 0
            return { items: rows.map(({ _total, ...r }) => r), total, page, page_size }
        },
    })

    fastify.get('/:id', {
        preHandler: [fastify.authenticate],
        schema: { params: IdParam },
        handler: async (request, reply) => {
            const rows = await getResource.run({ id: request.params.id }, fastify.db)
            if (rows.length === 0) return reply.status(404).send({ error: 'Not Found', message: 'Resource not found' })
            const recent = await listResourceTransactionsRecent.run({ resource_id: request.params.id }, fastify.db)
            return { ...rows[0], recent_transactions: recent }
        },
    })

    fastify.post('/', {
        preHandler: [fastify.authenticate, authorizeRole(['manager'])],
        schema: { body: CreateBody },
        handler: async (request, reply) => {
            const user = request.user as any
            const b = request.body
            try {
                const [r] = await insertResource.run({
                    name: b.name, description: b.description ?? null,
                    aliases: b.aliases ? JSON.stringify(b.aliases) : null,
                    import_source: b.import_source ?? null,
                    low_stock_threshold_kg: (b.low_stock_threshold_kg ?? null) as any,
                    created_by: user.id,
                }, fastify.db)
                return reply.status(201).send({ id: r.id })
            } catch (err: any) {
                if (err.code === '23505') return reply.status(409).send({ error: 'Conflict', message: 'Resource name must be unique' })
                fastify.log.error(err)
                return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to create resource' })
            }
        },
    })

    fastify.patch('/:id', {
        preHandler: [fastify.authenticate, authorizeRole(['manager'])],
        schema: { params: IdParam, body: PatchBody },
        handler: async (request, reply) => {
            const b = request.body
            if (!b.name && !b.description && !b.aliases && !b.import_source && b.low_stock_threshold_kg === undefined) {
                return reply.status(400).send({ error: 'Bad Request', message: 'No fields to update' })
            }
            try {
                const rows = await patchResource.run({
                    id: request.params.id,
                    name: b.name ?? null, description: b.description ?? null,
                    aliases: b.aliases ? JSON.stringify(b.aliases) : null,
                    import_source: b.import_source ?? null,
                    low_stock_threshold_kg: (b.low_stock_threshold_kg ?? null) as any,
                    clear_threshold: b.low_stock_threshold_kg === null,
                }, fastify.db)
                if (rows.length === 0) return reply.status(404).send({ error: 'Not Found', message: 'Resource not found' })
                return { id: rows[0].id }
            } catch (err: any) {
                if (err.code === '23505') return reply.status(409).send({ error: 'Conflict', message: 'Resource name must be unique' })
                fastify.log.error(err)
                return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to update resource' })
            }
        },
    })

    fastify.post('/:id/archive', {
        preHandler: [fastify.authenticate, authorizeRole(['manager'])],
        schema: { params: IdParam },
        handler: async (request, reply) => {
            const user = request.user as any
            const rows = await archiveResource.run({ id: request.params.id, user_id: user.id }, fastify.db)
            if (rows.length === 0) return reply.status(404).send({ error: 'Not Found', message: 'Resource not found or already archived' })
            return { id: rows[0].id }
        },
    })

    fastify.post('/:id/restore', {
        preHandler: [fastify.authenticate, authorizeRole(['manager'])],
        schema: { params: IdParam },
        handler: async (request, reply) => {
            const rows = await restoreResource.run({ id: request.params.id }, fastify.db)
            if (rows.length === 0) return reply.status(404).send({ error: 'Not Found', message: 'Resource not found' })
            return { id: rows[0].id }
        },
    })
}
