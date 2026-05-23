/**
 * Paints + Paint Variants module (spec §3.1).
 *
 * Variant matrix = (paint × classifications × ink_series). Formulas, packs,
 * orders and runs all reference paint_variants(id).
 */

import { FastifyInstance } from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'
import { authorizeRole } from '../../utils/authorizeRole'
import { withTransaction } from '../../utils/withTransaction'
import {
    listPaints, getPaint, insertPaint, patchPaint,
    archivePaint, restorePaint, archivePaintVariants, restorePaintVariants,
    paintExists, upsertPaintVariant,
    getVariant, archiveVariant, restoreVariant,
} from '../../queries'

const Classification = Type.Union([Type.Literal('oil_based'), Type.Literal('water_based')])
const InkSeries      = Type.Union([Type.Literal('LCS'), Type.Literal('STD'), Type.Literal('OPQ_JS')])
const IdParam        = Type.Object({ id: Type.Integer({ minimum: 1 }) })

const CreatePaintBody = Type.Object({
    name:            Type.String({ minLength: 1, maxLength: 255 }),
    swatch:          Type.Optional(Type.String({ maxLength: 50 })),
    notes:           Type.Optional(Type.String()),
    hsn_code:        Type.Optional(Type.String({ maxLength: 50 })),
    product_code:    Type.Optional(Type.String({ maxLength: 50 })),
    tags:            Type.Optional(Type.Array(Type.String({ maxLength: 50 }), { maxItems: 32 })),
    classifications: Type.Array(Classification, { minItems: 1, maxItems: 2, uniqueItems: true }),
    ink_series:      Type.Array(InkSeries,      { minItems: 1, maxItems: 3, uniqueItems: true }),
})

const PatchPaintBody = Type.Object({
    name:         Type.Optional(Type.String({ minLength: 1, maxLength: 255 })),
    swatch:       Type.Optional(Type.String({ maxLength: 50 })),
    notes:        Type.Optional(Type.String()),
    hsn_code:     Type.Optional(Type.String({ maxLength: 50 })),
    product_code: Type.Optional(Type.String({ maxLength: 50 })),
    tags:         Type.Optional(Type.Array(Type.String({ maxLength: 50 }), { maxItems: 32 })),
})

const AddVariantsBody = Type.Object({
    classifications: Type.Array(Classification, { minItems: 1, maxItems: 2, uniqueItems: true }),
    ink_series:      Type.Array(InkSeries,      { minItems: 1, maxItems: 3, uniqueItems: true }),
})

const ListQuery = Type.Object({
    page:           Type.Optional(Type.Integer({ minimum: 1 })),
    page_size:      Type.Optional(Type.Integer({ minimum: 1, maximum: 100 })),
    search:         Type.Optional(Type.String({ maxLength: 100 })),
    hsn_code:       Type.Optional(Type.String({ maxLength: 50 })),
    product_code:   Type.Optional(Type.String({ maxLength: 50 })),
    classification: Type.Optional(Classification),
    ink_series:     Type.Optional(InkSeries),
    tag:            Type.Optional(Type.String({ maxLength: 50 })),
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
            const rows = await listPaints.run({
                page_size, page_offset: (page - 1) * page_size,
                search:           q.search ? `%${q.search}%` : null,
                hsn_code:         q.hsn_code ?? null,
                product_code:     q.product_code ?? null,
                classification:   q.classification ?? null,
                ink_series:       q.ink_series ?? null,
                tag:              q.tag ?? null,
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
            const rows = await getPaint.run({ id: request.params.id }, fastify.db)
            if (rows.length === 0) return reply.status(404).send({ error: 'Not Found', message: 'Paint not found' })
            return rows[0]
        },
    })

    fastify.post('/', {
        preHandler: [fastify.authenticate, authorizeRole(['manager'])],
        schema: { body: CreatePaintBody },
        handler: async (request, reply) => {
            const user = request.user as any
            const b = request.body
            try {
                const id = await withTransaction(fastify.db, async (tx) => {
                    const [paint] = await insertPaint.run({
                        name: b.name, swatch: b.swatch ?? null, notes: b.notes ?? null,
                        hsn_code: b.hsn_code ?? null, product_code: b.product_code ?? null,
                        tags: b.tags ? JSON.stringify(b.tags) : null,
                        created_by: user.id,
                    }, tx)
                    for (const c of b.classifications) for (const s of b.ink_series) {
                        await upsertPaintVariant.run({ paint_id: paint.id, classification: c, ink_series: s }, tx)
                    }
                    return paint.id
                })
                return reply.status(201).send({ id })
            } catch (err: any) {
                if (err.code === '23505') return reply.status(409).send({ error: 'Conflict', message: 'A paint with that name or product code already exists' })
                fastify.log.error(err)
                return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to create paint' })
            }
        },
    })

    fastify.patch('/:id', {
        preHandler: [fastify.authenticate, authorizeRole(['manager'])],
        schema: { params: IdParam, body: PatchPaintBody },
        handler: async (request, reply) => {
            const b = request.body
            if (!b.name && !b.swatch && !b.notes && !b.hsn_code && !b.product_code && !b.tags) {
                return reply.status(400).send({ error: 'Bad Request', message: 'No fields to update' })
            }
            try {
                const rows = await patchPaint.run({
                    id: request.params.id,
                    name: b.name ?? null, swatch: b.swatch ?? null, notes: b.notes ?? null,
                    hsn_code: b.hsn_code ?? null, product_code: b.product_code ?? null,
                    tags: b.tags ? JSON.stringify(b.tags) : null,
                }, fastify.db)
                if (rows.length === 0) return reply.status(404).send({ error: 'Not Found', message: 'Paint not found' })
                return { id: rows[0].id }
            } catch (err: any) {
                if (err.code === '23505') return reply.status(409).send({ error: 'Conflict', message: 'Duplicate name or product code' })
                fastify.log.error(err)
                return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to update paint' })
            }
        },
    })

    fastify.post('/:id/variants', {
        preHandler: [fastify.authenticate, authorizeRole(['manager'])],
        schema: { params: IdParam, body: AddVariantsBody },
        handler: async (request, reply) => {
            const id = request.params.id
            const { classifications, ink_series } = request.body
            try {
                await withTransaction(fastify.db, async (tx) => {
                    const exists = await paintExists.run({ id }, tx)
                    if (exists.length === 0) throw Object.assign(new Error('Paint not found'), { statusCode: 404 })
                    for (const c of classifications) for (const s of ink_series) {
                        await upsertPaintVariant.run({ paint_id: id, classification: c, ink_series: s }, tx)
                    }
                })
                return { id }
            } catch (err: any) {
                if (err.statusCode === 404) return reply.status(404).send({ error: 'Not Found', message: err.message })
                fastify.log.error(err)
                return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to add variants' })
            }
        },
    })

    fastify.post('/:id/archive', {
        preHandler: [fastify.authenticate, authorizeRole(['manager'])],
        schema: { params: IdParam },
        handler: async (request, reply) => {
            const user = request.user as any
            const id = request.params.id
            const result = await withTransaction(fastify.db, async (tx) => {
                const rows = await archivePaint.run({ id, user_id: user.id }, tx)
                if (rows.length === 0) return null
                await archivePaintVariants.run({ paint_id: id, user_id: user.id }, tx)
                return rows[0].id
            })
            if (result === null) return reply.status(404).send({ error: 'Not Found', message: 'Paint not found or already archived' })
            return { id: result }
        },
    })

    fastify.post('/:id/restore', {
        preHandler: [fastify.authenticate, authorizeRole(['manager'])],
        schema: { params: IdParam },
        handler: async (request, reply) => {
            const id = request.params.id
            const result = await withTransaction(fastify.db, async (tx) => {
                const rows = await restorePaint.run({ id }, tx)
                if (rows.length === 0) return null
                await restorePaintVariants.run({ paint_id: id }, tx)
                return rows[0].id
            })
            if (result === null) return reply.status(404).send({ error: 'Not Found', message: 'Paint not found' })
            return { id: result }
        },
    })

    fastify.get('/variants/:id', {
        preHandler: [fastify.authenticate],
        schema: { params: IdParam },
        handler: async (request, reply) => {
            const rows = await getVariant.run({ id: request.params.id }, fastify.db)
            if (rows.length === 0) return reply.status(404).send({ error: 'Not Found', message: 'Variant not found' })
            return rows[0]
        },
    })

    fastify.post('/variants/:id/archive', {
        preHandler: [fastify.authenticate, authorizeRole(['manager'])],
        schema: { params: IdParam },
        handler: async (request, reply) => {
            const user = request.user as any
            const rows = await archiveVariant.run({ id: request.params.id, user_id: user.id }, fastify.db)
            if (rows.length === 0) return reply.status(404).send({ error: 'Not Found', message: 'Variant not found or already archived' })
            return { id: rows[0].id }
        },
    })

    fastify.post('/variants/:id/restore', {
        preHandler: [fastify.authenticate, authorizeRole(['manager'])],
        schema: { params: IdParam },
        handler: async (request, reply) => {
            const rows = await restoreVariant.run({ id: request.params.id }, fastify.db)
            if (rows.length === 0) return reply.status(404).send({ error: 'Not Found', message: 'Variant not found' })
            return { id: rows[0].id }
        },
    })
}
