/**
 * Formulas + Formula Resources module (spec §3.1).
 */

import { FastifyInstance } from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'
import { authorizeRole } from '../../utils/authorizeRole'
import { withTransaction } from '../../utils/withTransaction'
import {
    listFormulas, listFormulasByVariant, getFormula,
    clearDefaultFormulaForVariant, insertFormula,
    getFormulaForCopy, insertFormulaCopy, copyFormulaIngredients,
    patchFormula, deleteFormulaIngredients, insertFormulaIngredient,
    formulaExists, getFormulaVariant, setFormulaDefault,
    archiveFormula, restoreFormula,
} from '../../queries'

const IdParam        = Type.Object({ id:        Type.Integer({ minimum: 1 }) })
const VariantIdParam = Type.Object({ variantId: Type.Integer({ minimum: 1 }) })

const IngredientItem = Type.Object({
    resource_id: Type.Integer({ minimum: 1 }),
    quantity_kg: Type.Number({ exclusiveMinimum: 0 }),
})

const CreateFormulaBody = Type.Object({
    variant_id:                      Type.Integer({ minimum: 1 }),
    name:                            Type.String({ minLength: 1, maxLength: 255 }),
    notes:                           Type.Optional(Type.String()),
    standard_output_kg:              Type.Number({ exclusiveMinimum: 0 }),
    is_default:                      Type.Optional(Type.Boolean()),
    wastage_threshold_pct:           Type.Optional(Type.Number({ minimum: 0 })),
    resource_variance_threshold_pct: Type.Optional(Type.Number({ minimum: 0 })),
    dilution_threshold_pct:          Type.Optional(Type.Number({ minimum: 0 })),
    ingredients:                     Type.Array(IngredientItem, { minItems: 1, maxItems: 200 }),
})

const PatchFormulaBody = Type.Object({
    name:                            Type.Optional(Type.String({ minLength: 1, maxLength: 255 })),
    notes:                           Type.Optional(Type.String()),
    standard_output_kg:              Type.Optional(Type.Number({ exclusiveMinimum: 0 })),
    wastage_threshold_pct:           Type.Optional(Type.Union([Type.Number({ minimum: 0 }), Type.Null()])),
    resource_variance_threshold_pct: Type.Optional(Type.Union([Type.Number({ minimum: 0 }), Type.Null()])),
    dilution_threshold_pct:          Type.Optional(Type.Union([Type.Number({ minimum: 0 }), Type.Null()])),
})

const CopyFormulaBody = Type.Object({
    variant_id: Type.Optional(Type.Integer({ minimum: 1 })),
    name:       Type.Optional(Type.String({ minLength: 1, maxLength: 255 })),
})

const ReplaceIngredientsBody = Type.Object({
    ingredients: Type.Array(IngredientItem, { minItems: 1, maxItems: 200 }),
})

const ListQuery = Type.Object({
    page:             Type.Optional(Type.Integer({ minimum: 1 })),
    page_size:        Type.Optional(Type.Integer({ minimum: 1, maximum: 100 })),
    search:           Type.Optional(Type.String({ maxLength: 100 })),
    variant_id:       Type.Optional(Type.Integer({ minimum: 1 })),
    include_archived: Type.Optional(Type.Boolean()),
})

async function replaceIngredients(tx: any, formulaId: number, ingredients: ReadonlyArray<{ resource_id: number; quantity_kg: number }>): Promise<void> {
    await deleteFormulaIngredients.run({ formula_id: formulaId }, tx)
    for (const i of ingredients) {
        await insertFormulaIngredient.run({ formula_id: formulaId, resource_id: i.resource_id, quantity_kg: i.quantity_kg as any }, tx)
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
            const rows = await listFormulas.run({
                page_size, page_offset: (page - 1) * page_size,
                search:           q.search ? `%${q.search}%` : null,
                variant_id:       q.variant_id ?? null,
                include_archived: q.include_archived ?? null,
            }, fastify.db)
            const total = rows[0]?._total ? Number(rows[0]._total) : 0
            return { items: rows.map(({ _total, ...r }) => r), total, page, page_size }
        },
    })

    fastify.get('/variants/:variantId', {
        preHandler: [fastify.authenticate],
        schema: { params: VariantIdParam },
        handler: async (request) => listFormulasByVariant.run({ variant_id: request.params.variantId }, fastify.db),
    })

    fastify.get('/:id', {
        preHandler: [fastify.authenticate],
        schema: { params: IdParam },
        handler: async (request, reply) => {
            const rows = await getFormula.run({ id: request.params.id }, fastify.db)
            if (rows.length === 0) return reply.status(404).send({ error: 'Not Found', message: 'Formula not found' })
            return rows[0]
        },
    })

    fastify.post('/', {
        preHandler: [fastify.authenticate, authorizeRole(['manager'])],
        schema: { body: CreateFormulaBody },
        handler: async (request, reply) => {
            const user = request.user as any
            const b = request.body
            try {
                const id = await withTransaction(fastify.db, async (tx) => {
                    if (b.is_default) await clearDefaultFormulaForVariant.run({ variant_id: b.variant_id }, tx)
                    const [f] = await insertFormula.run({
                        variant_id: b.variant_id, name: b.name, notes: b.notes ?? null,
                        standard_output_kg: b.standard_output_kg as any,
                        is_default: b.is_default ?? null,
                        wastage_threshold_pct: (b.wastage_threshold_pct ?? null) as any,
                        resource_variance_threshold_pct: (b.resource_variance_threshold_pct ?? null) as any,
                        dilution_threshold_pct: (b.dilution_threshold_pct ?? null) as any,
                        created_by: user.id,
                    }, tx)
                    await replaceIngredients(tx, f.id, b.ingredients)
                    return f.id
                })
                return reply.status(201).send({ id })
            } catch (err: any) {
                if (err.code === '23503') return reply.status(400).send({ error: 'Bad Request', message: 'Unknown variant_id or resource_id' })
                if (err.code === '23505') return reply.status(409).send({ error: 'Conflict', message: 'Duplicate ingredient or already a default' })
                fastify.log.error(err)
                return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to create formula' })
            }
        },
    })

    fastify.post('/:id/copy', {
        preHandler: [fastify.authenticate, authorizeRole(['manager'])],
        schema: { params: IdParam, body: CopyFormulaBody },
        handler: async (request, reply) => {
            const user = request.user as any
            const sourceId = request.params.id
            try {
                const newId = await withTransaction(fastify.db, async (tx) => {
                    const src = await getFormulaForCopy.run({ id: sourceId }, tx)
                    if (src.length === 0) throw Object.assign(new Error('Source formula not found'), { statusCode: 404 })
                    const s = src[0]
                    const [inserted] = await insertFormulaCopy.run({
                        variant_id: request.body.variant_id ?? s.variant_id,
                        name: request.body.name ?? `${s.name} (copy)`,
                        notes: s.notes,
                        standard_output_kg: s.standard_output_kg,
                        wastage_threshold_pct: s.wastage_threshold_pct,
                        resource_variance_threshold_pct: s.resource_variance_threshold_pct,
                        dilution_threshold_pct: s.dilution_threshold_pct,
                        created_by: user.id,
                    }, tx)
                    await copyFormulaIngredients.run({ new_id: inserted.id, source_id: sourceId }, tx)
                    return inserted.id
                })
                return reply.status(201).send({ id: newId })
            } catch (err: any) {
                if (err.statusCode === 404) return reply.status(404).send({ error: 'Not Found', message: err.message })
                if (err.code === '23503') return reply.status(400).send({ error: 'Bad Request', message: 'Target variant_id does not exist' })
                fastify.log.error(err)
                return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to copy formula' })
            }
        },
    })

    fastify.patch('/:id', {
        preHandler: [fastify.authenticate, authorizeRole(['manager'])],
        schema: { params: IdParam, body: PatchFormulaBody },
        handler: async (request, reply) => {
            const b = request.body
            const hasField = b.name !== undefined || b.notes !== undefined || b.standard_output_kg !== undefined
                || b.wastage_threshold_pct !== undefined || b.resource_variance_threshold_pct !== undefined
                || b.dilution_threshold_pct !== undefined
            if (!hasField) return reply.status(400).send({ error: 'Bad Request', message: 'No fields to update' })
            const rows = await patchFormula.run({
                id: request.params.id,
                name: b.name ?? null, notes: b.notes ?? null,
                standard_output_kg: (b.standard_output_kg ?? null) as any,
                wastage_threshold_pct:           (b.wastage_threshold_pct ?? null) as any,
                resource_variance_threshold_pct: (b.resource_variance_threshold_pct ?? null) as any,
                dilution_threshold_pct:          (b.dilution_threshold_pct ?? null) as any,
                clear_wastage:  b.wastage_threshold_pct === null,
                clear_variance: b.resource_variance_threshold_pct === null,
                clear_dilution: b.dilution_threshold_pct === null,
            }, fastify.db)
            if (rows.length === 0) return reply.status(404).send({ error: 'Not Found', message: 'Formula not found' })
            return { id: rows[0].id }
        },
    })

    fastify.put('/:id/ingredients', {
        preHandler: [fastify.authenticate, authorizeRole(['manager'])],
        schema: { params: IdParam, body: ReplaceIngredientsBody },
        handler: async (request, reply) => {
            const id = request.params.id
            try {
                await withTransaction(fastify.db, async (tx) => {
                    const ok = await formulaExists.run({ id }, tx)
                    if (ok.length === 0) throw Object.assign(new Error('Formula not found'), { statusCode: 404 })
                    await replaceIngredients(tx, id, request.body.ingredients)
                })
                return { id }
            } catch (err: any) {
                if (err.statusCode === 404) return reply.status(404).send({ error: 'Not Found', message: err.message })
                if (err.code === '23503') return reply.status(400).send({ error: 'Bad Request', message: 'Unknown resource_id' })
                fastify.log.error(err)
                return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to replace ingredients' })
            }
        },
    })

    fastify.post('/:id/default', {
        preHandler: [fastify.authenticate, authorizeRole(['manager'])],
        schema: { params: IdParam },
        handler: async (request, reply) => {
            const id = request.params.id
            try {
                const ok = await withTransaction(fastify.db, async (tx) => {
                    const target = await getFormulaVariant.run({ id }, tx)
                    if (target.length === 0) return false
                    await clearDefaultFormulaForVariant.run({ variant_id: target[0].variant_id }, tx)
                    await setFormulaDefault.run({ id }, tx)
                    return true
                })
                if (!ok) return reply.status(404).send({ error: 'Not Found', message: 'Formula not found' })
                return { id }
            } catch (err) {
                fastify.log.error(err)
                return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to set default' })
            }
        },
    })

    fastify.post('/:id/archive', {
        preHandler: [fastify.authenticate, authorizeRole(['manager'])],
        schema: { params: IdParam },
        handler: async (request, reply) => {
            const user = request.user as any
            const rows = await archiveFormula.run({ id: request.params.id, user_id: user.id }, fastify.db)
            if (rows.length === 0) return reply.status(404).send({ error: 'Not Found', message: 'Formula not found or already archived' })
            return { id: rows[0].id }
        },
    })

    fastify.post('/:id/restore', {
        preHandler: [fastify.authenticate, authorizeRole(['manager'])],
        schema: { params: IdParam },
        handler: async (request, reply) => {
            const rows = await restoreFormula.run({ id: request.params.id }, fastify.db)
            if (rows.length === 0) return reply.status(404).send({ error: 'Not Found', message: 'Formula not found' })
            return { id: rows[0].id }
        },
    })
}
