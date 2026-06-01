/**
 * Production module — spec §3.3.
 *
 * Operator workflow: pick a request → open a run → log actuals (computes
 * wastage + variance flags) → optional dilution → pack into finished_paint_packs
 * (residue → paint_variant_stash) → complete. Threshold resolution:
 * per-formula override → app_settings → SYSTEM_DEFAULTS.
 */

import { FastifyInstance } from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'
import { authorizeRole } from '../../utils/authorizeRole'
import { withTransaction } from '../../utils/withTransaction'
import {
    listProductionRequests, getProductionRequest, insertProductionRequest,
    cancelProductionRequest, markRequestInProduction, markRequestCompleted,
    listProductionRuns, getProductionRun,
    pickDefaultFormulaForVariant, insertProductionRun, startProductionRun,
    lockRunForActuals, getFormulaResources,
    deleteRunActuals, insertRunActual, insertConsumptionTxn, updateRunActualsHeader,
    lockRunForDilution, insertDilutionRow, insertDilutionConsumptionTxn,
    sumDilutionForRun, updateRunDilutionTotals,
    lockRunForPackaging, activePackSizesIn, formulaCostBaseline,
    insertProducedPack, insertStashTxn,
    completeRun, cancelRun, markPackReady,
    lockStashForRepack, activePackSizeExists,
    latestProducedPackCost, latestRunForVariant, insertProducedPackForRepack,
    productionRunsByStatus, flaggedRunsLast30,
    listAppSettings,
} from '../../queries'

const IdParam        = Type.Object({ id:        Type.Integer({ minimum: 1 }) })
const PackIdParam    = Type.Object({ packId:    Type.Integer({ minimum: 1 }) })
const VariantIdParam = Type.Object({ variantId: Type.Integer({ minimum: 1 }) })

const SYSTEM_DEFAULTS = {
    wastage_threshold_pct:           5,
    resource_variance_threshold_pct: 10,
    dilution_threshold_pct:          10,
}

const CreateRequestBody = Type.Object({
    variant_id:     Type.Integer({ minimum: 1 }),
    pack_size_kg:   Type.Number({ exclusiveMinimum: 0 }),
    quantity_packs: Type.Integer({ exclusiveMinimum: 0 }),
    notes:          Type.Optional(Type.String()),
})

const CreateRunBody = Type.Object({
    request_id:         Type.Optional(Type.Integer({ minimum: 1 })),
    variant_id:         Type.Integer({ minimum: 1 }),
    formula_id:         Type.Optional(Type.Integer({ minimum: 1 })),
    batch_number:       Type.String({ minLength: 1, maxLength: 50 }),
    expected_output_kg: Type.Number({ exclusiveMinimum: 0 }),
    notes:              Type.Optional(Type.String()),
})

const ResourceActualItem = Type.Object({
    resource_id: Type.Integer({ minimum: 1 }),
    actual_kg:   Type.Number({ minimum: 0 }),
})

const ActualsBody = Type.Object({
    actual_output_kg: Type.Number({ minimum: 0 }),
    resources:        Type.Array(ResourceActualItem, { minItems: 1, maxItems: 200 }),
})

const DilutionBody = Type.Object({
    resource_id: Type.Integer({ minimum: 1 }),
    kg_added:    Type.Number({ exclusiveMinimum: 0 }),
    notes:       Type.Optional(Type.String()),
})

const PackagingItem = Type.Object({
    pack_size_kg: Type.Number({ exclusiveMinimum: 0 }),
    units:        Type.Integer({ minimum: 1 }),
    location:     Type.Optional(Type.String({ maxLength: 255 })),
})

const PackagingBody = Type.Object({
    packs:    Type.Array(PackagingItem, { minItems: 0, maxItems: 50 }),
    stash_kg: Type.Optional(Type.Number({ minimum: 0 })),
    notes:    Type.Optional(Type.String()),
})

const RepackageBody = Type.Object({
    pack_size_kg: Type.Number({ exclusiveMinimum: 0 }),
    units:        Type.Integer({ minimum: 1 }),
    notes:        Type.Optional(Type.String()),
})

const ListRunsQuery = Type.Object({
    page:        Type.Optional(Type.Integer({ minimum: 1 })),
    page_size:   Type.Optional(Type.Integer({ minimum: 1, maximum: 100 })),
    status:      Type.Optional(Type.Union([
        Type.Literal('planned'), Type.Literal('in_progress'),
        Type.Literal('completed'), Type.Literal('cancelled'),
    ])),
    variant_id:  Type.Optional(Type.Integer({ minimum: 1 })),
    operator_id: Type.Optional(Type.Integer({ minimum: 1 })),
})

const ListRequestsQuery = Type.Object({
    status: Type.Optional(Type.Union([
        Type.Literal('pending'), Type.Literal('in_production'),
        Type.Literal('completed'), Type.Literal('cancelled'),
    ])),
})

async function loadThresholds(tx: any): Promise<Record<string, number>> {
    const rows = await listAppSettings.run(undefined as any, tx)
    const out: Record<string, number> = {}
    for (const r of rows) {
        if (r.key === 'wastage_threshold_pct' || r.key === 'resource_variance_threshold_pct' || r.key === 'dilution_threshold_pct') {
            out[r.key] = typeof r.value === 'number' ? r.value : Number(r.value)
        }
    }
    return out
}

function pickThreshold(perFormula: any, configured: number | undefined, systemDefault: number): number {
    if (perFormula !== null && perFormula !== undefined) return Number(perFormula)
    if (configured !== undefined && !Number.isNaN(configured)) return configured
    return systemDefault
}

export default async function (fastifyRaw: FastifyInstance) {
    const fastify = fastifyRaw.withTypeProvider<TypeBoxTypeProvider>()

    // requests

    fastify.get('/requests', {
        preHandler: [fastify.authenticate, authorizeRole(['manager', 'operator', 'sales'])],
        schema: { querystring: ListRequestsQuery },
        handler: async (request) => listProductionRequests.run(
            { status: (request.query.status ?? 'pending') as any },
            fastify.db,
        ),
    })

    fastify.get('/requests/:id', {
        preHandler: [fastify.authenticate, authorizeRole(['manager', 'operator', 'sales'])],
        schema: { params: IdParam },
        handler: async (request, reply) => {
            const rows = await getProductionRequest.run({ id: request.params.id }, fastify.db)
            if (rows.length === 0) return reply.status(404).send({ error: 'Not Found', message: 'Request not found' })
            return rows[0]
        },
    })

    fastify.post('/requests', {
        preHandler: [fastify.authenticate, authorizeRole(['manager'])],
        schema: { body: CreateRequestBody },
        handler: async (request, reply) => {
            const user = request.user as any
            const b = request.body
            try {
                const [r] = await insertProductionRequest.run({
                    variant_id: b.variant_id, pack_size_kg: b.pack_size_kg as any,
                    quantity_packs: b.quantity_packs, notes: b.notes ?? null, user_id: user.id,
                }, fastify.db)
                return reply.status(201).send({ id: r.id })
            } catch (err: any) {
                if (err.code === '23503') return reply.status(400).send({ error: 'Bad Request', message: 'Unknown variant_id' })
                fastify.log.error(err)
                return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to create request' })
            }
        },
    })

    fastify.post('/requests/:id/cancel', {
        preHandler: [fastify.authenticate, authorizeRole(['manager'])],
        schema: { params: IdParam },
        handler: async (request, reply) => {
            const rows = await cancelProductionRequest.run({ id: request.params.id }, fastify.db)
            if (rows.length === 0) return reply.status(404).send({ error: 'Not Found', message: 'Request not found or not cancellable' })
            return { id: rows[0].id }
        },
    })

    // runs

    fastify.get('/runs', {
        preHandler: [fastify.authenticate, authorizeRole(['manager', 'operator', 'sales'])],
        schema: { querystring: ListRunsQuery },
        handler: async (request) => {
            const q = request.query
            const page = q.page ?? 1
            const page_size = q.page_size ?? 20
            const rows = await listProductionRuns.run({
                page_size, page_offset: (page - 1) * page_size,
                status: (q.status ?? null) as any,
                variant_id: q.variant_id ?? null,
                operator_id: q.operator_id ?? null,
            }, fastify.db)
            const total = rows[0]?._total ? Number(rows[0]._total) : 0
            return { items: rows.map(({ _total, ...r }) => r), total, page, page_size }
        },
    })

    fastify.get('/runs/:id', {
        preHandler: [fastify.authenticate, authorizeRole(['manager', 'operator', 'sales'])],
        schema: { params: IdParam },
        handler: async (request, reply) => {
            const rows = await getProductionRun.run({ id: request.params.id }, fastify.db)
            if (rows.length === 0) return reply.status(404).send({ error: 'Not Found', message: 'Run not found' })
            return rows[0]
        },
    })

    fastify.post('/runs', {
        preHandler: [fastify.authenticate, authorizeRole(['manager', 'operator'])],
        schema: { body: CreateRunBody },
        handler: async (request, reply) => {
            const user = request.user as any
            const b = request.body
            try {
                const id = await withTransaction(fastify.db, async (tx) => {
                    let formulaId = b.formula_id
                    if (!formulaId) {
                        const def = await pickDefaultFormulaForVariant.run({ variant_id: b.variant_id }, tx)
                        if (def.length === 0) throw Object.assign(new Error('No formula available for this variant'), { statusCode: 400 })
                        formulaId = def[0].id
                    }
                    const [r] = await insertProductionRun.run({
                        batch_number: b.batch_number, request_id: b.request_id ?? null,
                        variant_id: b.variant_id, formula_id: formulaId,
                        expected_output_kg: b.expected_output_kg as any,
                        notes: b.notes ?? null, user_id: user.id,
                    }, tx)
                    if (b.request_id) await markRequestInProduction.run({ id: b.request_id }, tx)
                    return r.id
                })
                return reply.status(201).send({ id })
            } catch (err: any) {
                if (err.statusCode === 400) return reply.status(400).send({ error: 'Bad Request', message: err.message })
                if (err.code === '23505') return reply.status(409).send({ error: 'Conflict', message: 'batch_number already used' })
                if (err.code === '23503') return reply.status(400).send({ error: 'Bad Request', message: 'Unknown variant_id, formula_id or request_id' })
                fastify.log.error(err)
                return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to create run' })
            }
        },
    })

    fastify.post('/runs/:id/start', {
        preHandler: [fastify.authenticate, authorizeRole(['manager', 'operator'])],
        schema: { params: IdParam },
        handler: async (request, reply) => {
            const rows = await startProductionRun.run({ id: request.params.id }, fastify.db)
            if (rows.length === 0) return reply.status(409).send({ error: 'Conflict', message: 'Run must be in planned status' })
            return { id: rows[0].id }
        },
    })

    fastify.post('/runs/:id/actuals', {
        preHandler: [fastify.authenticate, authorizeRole(['manager', 'operator'])],
        schema: { params: IdParam, body: ActualsBody },
        handler: async (request, reply) => {
            const user = request.user as any
            const runId = request.params.id
            const b = request.body
            try {
                const result = await withTransaction(fastify.db, async (tx) => {
                    const rr = await lockRunForActuals.run({ id: runId }, tx)
                    if (rr.length === 0) throw Object.assign(new Error('Run not found'), { statusCode: 404 })
                    const run = rr[0]
                    if (!['planned', 'in_progress'].includes(run.status as string)) {
                        throw Object.assign(new Error('Run must be planned or in_progress'), { statusCode: 409 })
                    }
                    const settings = await loadThresholds(tx)
                    const wastageThreshold  = pickThreshold(run.wastage_threshold_pct, settings.wastage_threshold_pct, SYSTEM_DEFAULTS.wastage_threshold_pct)
                    const varianceThreshold = pickThreshold(run.resource_variance_threshold_pct, settings.resource_variance_threshold_pct, SYSTEM_DEFAULTS.resource_variance_threshold_pct)
                    const expected = Number(run.expected_output_kg)
                    const actual   = Number(b.actual_output_kg)
                    const wastagePct = expected > 0 ? ((expected - actual) / expected) * 100 : 0
                    const wastageFlagged = Math.abs(wastagePct) > wastageThreshold
                    const scale = expected / Number(run.standard_output_kg)
                    const fr = await getFormulaResources.run({ formula_id: run.formula_id! }, tx)
                    const expectedMap = new Map<number, number>(fr.map((r: any) => [r.resource_id, Number(r.quantity_kg) * scale]))
                    await deleteRunActuals.run({ run_id: runId }, tx)
                    for (const item of b.resources) {
                        const expectedKg = expectedMap.get(item.resource_id) ?? 0
                        const variancePct = expectedKg > 0 ? ((item.actual_kg - expectedKg) / expectedKg) * 100 : null
                        const flagged = variancePct !== null && variancePct > varianceThreshold
                        await insertRunActual.run({
                            run_id: runId, resource_id: item.resource_id,
                            expected_kg: expectedKg as any, actual_kg: item.actual_kg as any,
                            variance_pct: variancePct as any, flagged,
                        }, tx)
                        if (item.actual_kg > 0) {
                            await insertConsumptionTxn.run({
                                resource_id: item.resource_id, quantity_kg: -item.actual_kg as any,
                                run_id: runId, user_id: user.id,
                            }, tx)
                        }
                    }
                    await updateRunActualsHeader.run({
                        id: runId,
                        actual_output_kg: b.actual_output_kg as any,
                        wastage_pct: Number(wastagePct.toFixed(4)) as any,
                        wastage_flagged: wastageFlagged,
                    }, tx)
                    return { wastagePct, wastageFlagged }
                })
                return { id: runId, wastage_pct: Number(result.wastagePct.toFixed(4)), wastage_flagged: result.wastageFlagged }
            } catch (err: any) {
                if (err.statusCode === 404) return reply.status(404).send({ error: 'Not Found', message: err.message })
                if (err.statusCode === 409) return reply.status(409).send({ error: 'Conflict', message: err.message })
                fastify.log.error(err)
                return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to log actuals' })
            }
        },
    })

    fastify.post('/runs/:id/dilution', {
        preHandler: [fastify.authenticate, authorizeRole(['manager', 'operator'])],
        schema: { params: IdParam, body: DilutionBody },
        handler: async (request, reply) => {
            const user = request.user as any
            const runId = request.params.id
            const b = request.body
            try {
                const result = await withTransaction(fastify.db, async (tx) => {
                    const r = await lockRunForDilution.run({ id: runId }, tx)
                    if (r.length === 0) throw Object.assign(new Error('Run not found'), { statusCode: 404 })
                    if (!['planned', 'in_progress'].includes(r[0].status as string)) {
                        throw Object.assign(new Error('Run must be planned or in_progress to log dilution'), { statusCode: 409 })
                    }
                    await insertDilutionRow.run({
                        run_id: runId, resource_id: b.resource_id,
                        kg_added: b.kg_added as any, notes: b.notes ?? null,
                    }, tx)
                    await insertDilutionConsumptionTxn.run({
                        resource_id: b.resource_id, quantity_kg: -b.kg_added as any,
                        run_id: runId, notes: b.notes ?? null, user_id: user.id,
                    }, tx)
                    const settings = await loadThresholds(tx)
                    const threshold = pickThreshold(r[0].dilution_threshold_pct, settings.dilution_threshold_pct, SYSTEM_DEFAULTS.dilution_threshold_pct)
                    const tot = await sumDilutionForRun.run({ run_id: runId }, tx)
                    const total = Number(tot[0].total)
                    const output = Number(r[0].actual_output_kg ?? 0)
                    const ratio = output > 0 ? (total / output) * 100 : 0
                    const flagged = ratio > threshold
                    await updateRunDilutionTotals.run({ id: runId, total: total as any, flagged }, tx)
                    return { total, flagged }
                })
                return { id: runId, dilution_total_kg: result.total, dilution_flagged: result.flagged }
            } catch (err: any) {
                if (err.statusCode === 404) return reply.status(404).send({ error: 'Not Found', message: err.message })
                if (err.statusCode === 409) return reply.status(409).send({ error: 'Conflict', message: err.message })
                fastify.log.error(err)
                return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to log dilution' })
            }
        },
    })

    fastify.post('/runs/:id/packaging', {
        preHandler: [fastify.authenticate, authorizeRole(['manager', 'operator'])],
        schema: { params: IdParam, body: PackagingBody },
        handler: async (request, reply) => {
            const user = request.user as any
            const runId = request.params.id
            const b = request.body
            try {
                const created = await withTransaction(fastify.db, async (tx) => {
                    const r = await lockRunForPackaging.run({ id: runId }, tx)
                    if (r.length === 0) throw Object.assign(new Error('Run not found'), { statusCode: 404 })
                    const rr = r[0]
                    if (rr.actual_output_kg == null) throw Object.assign(new Error('Log actuals before packaging'), { statusCode: 409 })
                    const packKg = b.packs.reduce((s, p) => s + p.pack_size_kg * p.units, 0)
                    const stash = b.stash_kg ?? 0
                    const totalAvailable = Number(rr.actual_output_kg) + Number(rr.dilution_total_kg ?? 0)
                    if (packKg + stash > totalAvailable + 1e-6) {
                        throw Object.assign(new Error(`Packaging ${packKg + stash}kg exceeds available output ${totalAvailable}kg (actual + dilution)`), { statusCode: 400 })
                    }
                    if (b.packs.length > 0) {
                        const sizes = [...new Set(b.packs.map(p => p.pack_size_kg))]
                        const valid = await activePackSizesIn.run({ sizes: sizes as any }, tx)
                        const validSet = new Set(valid.map((row: any) => Number(row.pack_size_kg)))
                        for (const size of sizes) {
                            if (!validSet.has(size)) throw Object.assign(new Error(`Pack size ${size}kg is not active in pack_sizes`), { statusCode: 400 })
                        }
                    }
                    const baseline = await formulaCostBaseline.run({ formula_id: rr.formula_id! }, tx)
                    const costPerKg = baseline.length === 0 ? 0 : Number(baseline[0].total_cost) / Number(baseline[0].standard_output_kg)
                    for (const pack of b.packs) {
                        for (let i = 0; i < pack.units; i++) {
                            await insertProducedPack.run({
                                variant_id: rr.variant_id!, pack_size_kg: pack.pack_size_kg as any,
                                run_id: runId, cost_per_kg: costPerKg as any,
                                location: pack.location ?? null,
                            }, tx)
                        }
                    }
                    if (stash > 0) {
                        await insertStashTxn.run({
                            variant_id: rr.variant_id!, delta_kg: stash as any, action: 'added',
                            run_id: runId, notes: b.notes ?? null, user_id: user.id,
                        }, tx)
                    }
                    return b.packs.reduce((s, p) => s + p.units, 0)
                })
                return { id: runId, packs_created: created, stash_kg: b.stash_kg ?? 0 }
            } catch (err: any) {
                if (err.statusCode === 404) return reply.status(404).send({ error: 'Not Found', message: err.message })
                if (err.statusCode === 409) return reply.status(409).send({ error: 'Conflict', message: err.message })
                if (err.statusCode === 400) return reply.status(400).send({ error: 'Bad Request', message: err.message })
                fastify.log.error(err)
                return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to package run' })
            }
        },
    })

    fastify.post('/runs/:id/complete', {
        preHandler: [fastify.authenticate, authorizeRole(['manager', 'operator'])],
        schema: { params: IdParam },
        handler: async (request, reply) => {
            const runId = request.params.id
            try {
                const ok = await withTransaction(fastify.db, async (tx) => {
                    const rows = await completeRun.run({ id: runId }, tx)
                    if (rows.length === 0) return false
                    if (rows[0].request_id) await markRequestCompleted.run({ id: rows[0].request_id }, tx)
                    return true
                })
                if (!ok) return reply.status(409).send({ error: 'Conflict', message: 'Run must be planned or in_progress to complete' })
                return { id: runId }
            } catch (err) {
                fastify.log.error(err)
                return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to complete run' })
            }
        },
    })

    fastify.post('/runs/:id/cancel', {
        preHandler: [fastify.authenticate, authorizeRole(['manager', 'operator'])],
        schema: { params: IdParam },
        handler: async (request, reply) => {
            const rows = await cancelRun.run({ id: request.params.id }, fastify.db)
            if (rows.length === 0) return reply.status(409).send({ error: 'Conflict', message: 'Run is not cancellable' })
            return { id: rows[0].id }
        },
    })

    // packs / stash

    fastify.post('/packs/:packId/ready', {
        preHandler: [fastify.authenticate, authorizeRole(['manager', 'operator'])],
        schema: { params: PackIdParam },
        handler: async (request, reply) => {
            const rows = await markPackReady.run({ id: request.params.packId }, fastify.db)
            if (rows.length === 0) return reply.status(409).send({ error: 'Conflict', message: 'Pack not in_stock' })
            return { id: rows[0].id }
        },
    })

    fastify.post('/stash/:variantId/repackage', {
        preHandler: [fastify.authenticate, authorizeRole(['manager', 'operator'])],
        schema: { params: VariantIdParam, body: RepackageBody },
        handler: async (request, reply) => {
            const user = request.user as any
            const variantId = request.params.variantId
            const b = request.body
            const need = b.pack_size_kg * b.units
            try {
                await withTransaction(fastify.db, async (tx) => {
                    const stash = await lockStashForRepack.run({ variant_id: variantId }, tx)
                    if (stash.length === 0 || Number(stash[0].kg_remaining) < need - 1e-6) {
                        throw Object.assign(new Error('Insufficient stash for repackage'), { statusCode: 409 })
                    }
                    const valid = await activePackSizeExists.run({ pack_size_kg: b.pack_size_kg as any }, tx)
                    if (valid.length === 0) throw Object.assign(new Error(`Pack size ${b.pack_size_kg}kg is not active`), { statusCode: 400 })
                    const cost = await latestProducedPackCost.run({ variant_id: variantId }, tx)
                    const costPerKg = cost[0]?.cost_per_kg ?? 0
                    const latest = await latestRunForVariant.run({ variant_id: variantId }, tx)
                    const runIdRef = latest[0]?.id ?? null
                    for (let i = 0; i < b.units; i++) {
                        await insertProducedPackForRepack.run({
                            variant_id: variantId, pack_size_kg: b.pack_size_kg as any,
                            production_run_id: runIdRef, cost_per_kg: costPerKg as any,
                        }, tx)
                    }
                    await insertStashTxn.run({
                        variant_id: variantId, delta_kg: -need as any, action: 'repackaged',
                        run_id: null, notes: b.notes ?? null, user_id: user.id,
                    }, tx)
                })
                return { variant_id: variantId, packs_created: b.units }
            } catch (err: any) {
                if (err.statusCode === 409) return reply.status(409).send({ error: 'Conflict', message: err.message })
                if (err.statusCode === 400) return reply.status(400).send({ error: 'Bad Request', message: err.message })
                fastify.log.error(err)
                return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to repackage stash' })
            }
        },
    })

    // summary

    fastify.get('/summary', {
        preHandler: [fastify.authenticate, authorizeRole(['manager', 'operator', 'sales'])],
        handler: async () => {
            const [byStatus, flagged] = await Promise.all([
                productionRunsByStatus.run(undefined as any, fastify.db),
                flaggedRunsLast30.run(undefined as any, fastify.db),
            ])
            return {
                by_status: byStatus,
                flagged_last_30_days: Number(flagged[0]?.flagged_runs ?? 0),
            }
        },
    })
}
