/**
 * Production Module
 * Handles operations related to manufacturing paint and deducting raw materials.
 */

import { FastifyInstance } from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'
import { authorizeRole } from '../../utils/authorizeRole'

export default async function (fastifyRaw: FastifyInstance) {
    const fastify = fastifyRaw.withTypeProvider<TypeBoxTypeProvider>()

    const CreateProductionRunSchema = Type.Object({
        formulaId: Type.Integer(),
        expectedOutput: Type.Number({ exclusiveMinimum: 0 }),
        actualResources: Type.Array(
            Type.Object({
                resourceId: Type.Integer(),
                quantity: Type.Number({ exclusiveMinimum: 0 })
            }),
            { minItems: 1 }
        )
    })

    const PlanProductionRunSchema = Type.Object({
        formulaId: Type.Integer(),
        colorId: Type.Integer(),
        targetQty: Type.Number({ exclusiveMinimum: 0 }),
        operatorId: Type.Integer(),
        inkSeries: Type.Optional(Type.String()),
        actualResources: Type.Optional(Type.Array(
            Type.Object({
                resourceId: Type.Integer(),
                quantity: Type.Number({ exclusiveMinimum: 0 })
            })
        ))
    })

    const UpdateStatusSchema = Type.Object({
        status: Type.Union([
            Type.Literal('planned'),
            Type.Literal('running'),
            Type.Literal('paused'),
            Type.Literal('completed'),
            Type.Literal('packaging')
        ]),
        actual_quantity_kg: Type.Optional(Type.Number({ exclusiveMinimum: 0 })),
        waste_kg: Type.Optional(Type.Number({ minimum: 0 })),
        loss_reason: Type.Optional(Type.String())
    })

    const RunIdParamSchema = Type.Object({
        id: Type.Integer()
    })

    const EditRunSchema = Type.Object({
        formulaId: Type.Optional(Type.Integer()),
        targetQty: Type.Optional(Type.Number({ exclusiveMinimum: 0 })),
        operatorId: Type.Optional(Type.Integer()),
        actualResources: Type.Optional(Type.Array(
            Type.Object({
                resourceId: Type.Integer(),
                quantity: Type.Number({ exclusiveMinimum: 0 })
            })
        ))
    })

    const PackagingDetailsSchema = Type.Object({
        packaging_details: Type.Array(
            Type.Object({
                pack_size_kg: Type.Number({ exclusiveMinimum: 0 }),
                quantity_units: Type.Integer({ exclusiveMinimum: 0 })
            }),
            { minItems: 1 }
        )
    })

    const ListRunsQuerySchema = Type.Object({
        search: Type.Optional(Type.String()),
        color_id: Type.Optional(Type.Integer()),
        status: Type.Optional(Type.String()),
        from_date: Type.Optional(Type.String({ format: 'date' })),
        to_date: Type.Optional(Type.String({ format: 'date' }))
    })

    const HistoryQuerySchema = Type.Object({
        search: Type.Optional(Type.String()),
        color: Type.Optional(Type.String()),
        status: Type.Optional(Type.String()),
        start: Type.Optional(Type.String({ format: 'date' })),
        end: Type.Optional(Type.String({ format: 'date' }))
    })

    /**
     * GET /production-runs/metrics - Return top-card KPI metrics in camelCase.
     * { activeRuns, todayProduction, resourceConsumption, variance }
     * Accessible by 'admin', 'manager', or 'operator' roles.
     */
    fastify.get('/metrics', {
        preHandler: [fastify.authenticate, authorizeRole(['admin', 'manager', 'operator'])],
        schema: {
            querystring: HistoryQuerySchema
        },
        handler: async (request, reply) => {
            const { search, color, status, start, end } = request.query as any;
            try {
                // 1. Active Runs — anything not completed or packaging
                const activeRunsRes = await fastify.db.query(
                    `SELECT COUNT(*) AS count FROM production_runs pr
                     WHERE pr.status IN ('planned', 'running', 'paused')
                        OR (pr.status IN ('completed', 'packaging') 
                            AND (SELECT COALESCE(SUM(quantity_kg), 0) FROM finished_stock_transactions WHERE reference_id = pr.id AND transaction_type = 'production_entry') < (COALESCE(pr.actual_quantity_kg, pr.planned_quantity_kg) - 0.1)
                        )`
                )
                const activeRuns = parseInt(activeRunsRes.rows[0].count, 10)

                // Parse Filters
                let filterClause = ''
                const params: any[] = []

                if (search) {
                    params.push(`%${search}%`)
                    filterClause += ` AND (('PR-' || pr.id::text) ILIKE $${params.length} OR r.name ILIKE $${params.length} OR c.name ILIKE $${params.length})`
                }
                if (color) {
                    params.push(color)
                    filterClause += ` AND c.name ILIKE $${params.length}`
                }
                if (status && status !== 'All') {
                    params.push(status.toLowerCase())
                    filterClause += ` AND pr.status = $${params.length}`
                }
                if (start) {
                    params.push(start)
                    filterClause += ` AND DATE(pr.created_at) >= $${params.length}`
                }
                if (end) {
                    params.push(end)
                    filterClause += ` AND DATE(pr.created_at) <= $${params.length}`
                }
                // If NO filters at all, we now default to ALL TIME instead of CURRENT_DATE
                // to avoid confusing 0 totals if no production happened today.
                
                // 2. Production — sum of actual_quantity_kg
                // We default to 'completed' status ONLY if no specific status is requested.
                // Or if they specifically filter, we respect their filter.
                const statusClause = (!status || status === 'All') ? "AND pr.status = 'completed'" : "";
                
                const todayProductionRes = await fastify.db.query(
                    `SELECT COALESCE(SUM(pr.actual_quantity_kg), 0) AS total
                     FROM production_runs pr
                     JOIN formulas r ON pr.formula_id = r.id
                     JOIN colors c ON r.color_id = c.id
                     WHERE 1=1 ${filterClause} ${statusClause}`,
                    params
                )
                const todayProduction = parseFloat(todayProductionRes.rows[0].total)

                // 3. Resource Consumption — sum of actual qty used
                const consumptionRes = await fastify.db.query(
                    `SELECT COALESCE(SUM(pra.actual_quantity_used), 0) AS total
                     FROM production_resource_actuals pra
                     JOIN production_runs pr ON pra.production_run_id = pr.id
                     JOIN formulas r ON pr.formula_id = r.id
                     JOIN colors c ON r.color_id = c.id
                     WHERE 1=1 ${filterClause}`,
                    params
                )
                const resourceConsumption = parseFloat(consumptionRes.rows[0].total)

                // 4. Variance — sum(actual - planned)
                const varianceRes = await fastify.db.query(
                    `SELECT COALESCE(SUM(pr.actual_quantity_kg - pr.planned_quantity_kg), 0) AS variance
                     FROM production_runs pr
                     JOIN formulas r ON pr.formula_id = r.id
                     JOIN colors c ON r.color_id = c.id
                     WHERE 1=1 ${filterClause} ${statusClause}`,
                    params
                )
                const variance = parseFloat(varianceRes.rows[0].variance)

                return reply.send({
                    activeRuns,
                    todayProduction,
                    resourceConsumption,
                    variance
                })
            } catch (err) {
                fastify.log.error(err)
                return reply.status(500).send({
                    error: 'Internal Server Error',
                    message: 'Failed to retrieve production metrics'
                })
            }
        }
    })

    /**
     * GET /production-runs/history - Filtered production run history with per-row variance.
     * Query params: ?search, ?color, ?status, ?start, ?end
     * Accessible by 'admin', 'manager', or 'operator' roles.
     */
    fastify.get('/history', {
        preHandler: [fastify.authenticate, authorizeRole(['admin', 'manager', 'operator'])],
        schema: {
            querystring: HistoryQuerySchema
        },
        handler: async (request, reply) => {
            const { search, color, status, start, end } = request.query as any
            try {
                let query = `
                    SELECT
                        pr.id,
                        'PR-' || pr.id AS "batchId",
                        pr.status,
                        pr.planned_quantity_kg,
                        pr.actual_quantity_kg,
                        pr.waste_kg as "wasteQty",
                        pr.loss_reason as "lossReason",
                        (COALESCE(pr.actual_quantity_kg, pr.planned_quantity_kg)
                         - pr.planned_quantity_kg) AS variance,
                        pr.started_at,
                        pr.completed_at,
                        pr.created_at,
                        r.name AS formula_name,
                        c.name AS color_name,
                        (
                            SELECT COALESCE(SUM(pra.actual_quantity_used), 0)
                            FROM production_resource_actuals pra
                            WHERE pra.production_run_id = pr.id
                        ) AS resource_used,
                        (
                            SELECT json_agg(
                                json_build_object(
                                    'pack_size_kg', fst.pack_size_kg,
                                    'quantity_units', fst.quantity_units
                                )
                            )
                            FROM finished_stock_transactions fst
                            WHERE fst.reference_id = pr.id
                              AND fst.transaction_type = 'production_entry'
                        ) AS packaging
                    FROM production_runs pr
                    JOIN formulas r ON pr.formula_id = r.id
                    JOIN colors c ON r.color_id = c.id
                    WHERE 1=1
                `
                const params: any[] = []

                if (search) {
                    params.push(`%${search}%`)
                    query += ` AND (('PR-' || pr.id::text) ILIKE $${params.length} OR r.name ILIKE $${params.length} OR c.name ILIKE $${params.length})`
                }

                if (color) {
                    params.push(color)
                    query += ` AND c.name ILIKE $${params.length}`
                }

                if (status && status !== 'All') {
                    params.push(status.toLowerCase())
                    query += ` AND pr.status = $${params.length}`
                }

                if (start) {
                    params.push(start)
                    query += ` AND DATE(pr.created_at) >= $${params.length}`
                }

                if (end) {
                    params.push(end)
                    query += ` AND DATE(pr.created_at) <= $${params.length}`
                }

                query += ` ORDER BY pr.created_at DESC`

                const result = await fastify.db.query(query, params)
                return reply.send(result.rows)
            } catch (err) {
                fastify.log.error(err)
                return reply.status(500).send({
                    error: 'Internal Server Error',
                    message: 'Failed to retrieve production history'
                })
            }
        }
    })

    /**
     * GET /production-runs/active - List all non-completed production runs.
     * Returns planned, running, and paused batches in a consistent shape.
     */
    fastify.get('/active', {
        preHandler: [fastify.authenticate, authorizeRole(['admin', 'manager', 'operator'])],
        handler: async (request, reply) => {
            try {
                const result = await fastify.db.query(`
                    SELECT
                        pr.id,
                        'PR-' || pr.id AS "batchId",
                        c.name AS color,
                        r.name AS formula,
                        pr.planned_quantity_kg AS "targetQty",
                        pr.actual_quantity_kg,
                        pr.status,
                        pr.started_at,
                        pr.created_at,
                        u.username AS operator,
                        (
                            SELECT json_agg(
                                json_build_object(
                                    'pack_size_kg', fst.pack_size_kg,
                                    'quantity_units', fst.quantity_units
                                )
                            )
                            FROM finished_stock_transactions fst
                            WHERE fst.reference_id = pr.id
                              AND fst.transaction_type = 'production_entry'
                        ) AS packaging
                    FROM production_runs pr
                    JOIN formulas r ON pr.formula_id = r.id
                    JOIN colors c ON r.color_id = c.id
                    LEFT JOIN users u ON pr.created_by = u.id
                    WHERE pr.status IN ('planned', 'running', 'paused', 'completed', 'packaging')
                    AND (
                        pr.status IN ('planned', 'running', 'paused')
                        OR (
                            pr.status IN ('completed', 'packaging')
                            AND (SELECT COALESCE(SUM(quantity_kg), 0) FROM finished_stock_transactions WHERE reference_id = pr.id AND transaction_type = 'production_entry') < (COALESCE(pr.actual_quantity_kg, pr.planned_quantity_kg) - 0.1)
                        )
                    )
                    ORDER BY pr.created_at DESC
                `)
                return reply.send(result.rows)
            } catch (err) {
                fastify.log.error(err)
                return reply.status(500).send({
                    error: 'Internal Server Error',
                    message: 'Failed to retrieve active production runs'
                })
            }
        }
    })


    /**
     * GET /production-runs/summary - Get daily production summary metrics.
     * Accessible by 'admin', 'manager', or 'operator' roles.
     */
    fastify.get('/summary', {
        preHandler: [fastify.authenticate, authorizeRole(['admin', 'manager', 'operator'])],
        handler: async (request, reply) => {
            try {
                // 1. Active Runs
                const activeRunsRes = await fastify.db.query(
                    `SELECT COUNT(*) as count FROM production_runs pr 
                     WHERE pr.status IN ('planned', 'running', 'paused')
                        OR (pr.status IN ('completed', 'packaging') 
                            AND (SELECT COALESCE(SUM(quantity_kg), 0) FROM finished_stock_transactions WHERE reference_id = pr.id AND transaction_type = 'production_entry') < (COALESCE(pr.actual_quantity_kg, pr.planned_quantity_kg) - 0.1)
                        )`
                )
                const activeRuns = parseInt(activeRunsRes.rows[0].count, 10)

                // 2. Today's Production (Yield)
                const todaysProductionRes = await fastify.db.query(
                    `SELECT SUM(actual_quantity_kg) as total 
                     FROM production_runs 
                     WHERE DATE(created_at) = CURRENT_DATE AND status = 'completed'`
                )
                const todaysProduction = parseFloat(todaysProductionRes.rows[0].total || '0')

                // 3. Resource Consumption (Today)
                const todaysConsumptionRes = await fastify.db.query(
                    `SELECT SUM(pra.actual_quantity_used) as total 
                     FROM production_resource_actuals pra
                     JOIN production_runs pr ON pra.production_run_id = pr.id
                     WHERE DATE(pr.completed_at) = CURRENT_DATE`
                )
                const resourceConsumption = parseFloat(todaysConsumptionRes.rows[0].total || '0')

                // 4. Production Variance
                const varianceRes = await fastify.db.query(
                    `SELECT SUM(expected_quantity) as total_expected, SUM(actual_quantity_used) as total_actual
                     FROM production_resource_actuals pra
                     JOIN production_runs pr ON pra.production_run_id = pr.id
                     WHERE DATE(pr.completed_at) = CURRENT_DATE`
                )
                const totalExpected = parseFloat(varianceRes.rows[0].total_expected || '0')
                const totalActual = parseFloat(varianceRes.rows[0].total_actual || '0')

                let variancePercentage = 0;
                if (totalExpected > 0) {
                    variancePercentage = ((totalActual - totalExpected) / totalExpected) * 100;
                }

                return reply.send({
                    active_runs: activeRuns,
                    todays_production_kg: todaysProduction,
                    resource_consumption_kg: resourceConsumption, // Assuming standard metric mix is kg/kg
                    production_variance_percent: variancePercentage
                })
            } catch (err) {
                fastify.log.error(err)
                return reply.status(500).send({
                    error: 'Internal Server Error',
                    message: 'Failed to retrieve production summary'
                })
            }
        }
    })


    fastify.get('/:id', {
        preHandler: [fastify.authenticate, authorizeRole(['admin', 'manager', 'operator'])],
        schema: {
            params: RunIdParamSchema
        },
        handler: async (request, reply) => {
            const { id } = request.params
            try {
                // 1. Core run with joins
                const runResult = await fastify.db.query(`
                    SELECT
                        pr.id,
                        'PR-' || pr.id AS "batchId",
                        pr.status,
                        pr.planned_quantity_kg,
                        pr.actual_quantity_kg,
                        pr.waste_kg,
                        pr.loss_reason,
                        (COALESCE(pr.actual_quantity_kg, pr.planned_quantity_kg)
                         - pr.planned_quantity_kg) AS variance,
                        pr.started_at,
                        pr.completed_at,
                        pr.created_at,
                        pr.updated_at,
                        r.id AS formula_id,
                        r.name AS formula_name,
                        r.version AS formula_version,
                        r.batch_size_kg,
                        c.name AS color_name,
                        c.color_code,
                        u.username AS operator
                    FROM production_runs pr
                    JOIN formulas r ON pr.formula_id = r.id
                    JOIN colors c ON r.color_id = c.id
                    LEFT JOIN users u ON pr.created_by = u.id
                    WHERE pr.id = $1
                `, [id])

                if (runResult.rows.length === 0) {
                    return reply.status(404).send({
                        error: 'Not Found',
                        message: 'Production run not found'
                    })
                }

                const run = runResult.rows[0]

                // 2. Expected resources from formula (scaled to planned qty)
                const expectedResult = await fastify.db.query(`
                    SELECT
                        rr.resource_id,
                        res.name,
                        res.unit,
                        ROUND((rr.quantity_required * $2 / r.batch_size_kg)::numeric, 4) AS expected_qty
                    FROM formula_resources rr
                    JOIN resources res ON rr.resource_id = res.id
                    JOIN formulas r ON rr.formula_id = r.id
                    WHERE rr.formula_id = $1
                `, [run.formula_id, run.planned_quantity_kg])

                // 3. Actual resource consumption with variance
                const actualResult = await fastify.db.query(`
                    SELECT
                        pra.resource_id,
                        res.name,
                        res.unit,
                        pra.actual_quantity_used AS actual_qty,
                        pra.expected_quantity AS expected_qty,
                        pra.variance,
                        pra.variance_flag
                    FROM production_resource_actuals pra
                    JOIN resources res ON pra.resource_id = res.id
                    WHERE pra.production_run_id = $1
                    ORDER BY res.name
                `, [id])

                // 4. Packaging breakdown
                const packagingResult = await fastify.db.query(`
                    SELECT pack_size_kg, quantity_units,
                           (pack_size_kg * quantity_units) AS volume_kg
                    FROM finished_stock_transactions
                    WHERE reference_id = $1 AND transaction_type = 'production_entry'
                    ORDER BY pack_size_kg
                `, [id])

                return reply.send({
                    ...run,
                    expected_resources: expectedResult.rows,
                    actual_resources: actualResult.rows,
                    packaging: packagingResult.rows
                })
            } catch (err) {
                fastify.log.error(err)
                return reply.status(500).send({
                    error: 'Internal Server Error',
                    message: 'Failed to retrieve production run details'
                })
            }
        }
    })

    /**
     * GET /production-runs - List recent production runs with filtering and packaging info.
     * Accessible by 'admin', 'manager', or 'operator' roles.
     */
    fastify.get('/', {

        preHandler: [fastify.authenticate, authorizeRole(['admin', 'manager', 'operator'])],
        schema: {
            querystring: ListRunsQuerySchema
        },
        handler: async (request, reply) => {
            const { search, color_id, status, from_date, to_date } = request.query
            try {
                let query = `
                    SELECT pr.id, pr.status, pr.planned_quantity_kg, pr.actual_quantity_kg, 
                           pr.started_at, pr.completed_at, pr.created_at, r.name as formula_name, c.name as color_name,
                           (SELECT json_agg(json_build_object('pack_size_kg', fst.pack_size_kg, 'quantity_units', fst.quantity_units))
                            FROM finished_stock_transactions fst
                            WHERE fst.reference_id = pr.id AND fst.transaction_type = 'production_entry'
                           ) as packaging
                    FROM production_runs pr
                    JOIN formulas r ON pr.formula_id = r.id
                    JOIN colors c ON r.color_id = c.id
                    WHERE 1=1
                `
                const params: any[] = []

                if (search) {
                    params.push(`%${search}%`)
                    query += ` AND (('PR-' || pr.id::text) ILIKE $${params.length} OR r.name ILIKE $${params.length} OR c.name ILIKE $${params.length})`
                }

                if (color_id) {
                    params.push(color_id)
                    query += ` AND r.color_id = $${params.length}`
                }

                if (status && status !== 'All') {
                    params.push(status.toLowerCase())
                    query += ` AND pr.status = $${params.length}`
                }

                if (from_date) {
                    params.push(from_date)
                    query += ` AND DATE(pr.created_at) >= $${params.length}`
                }

                if (to_date) {
                    params.push(to_date)
                    query += ` AND DATE(pr.created_at) <= $${params.length}`
                }

                query += ` ORDER BY pr.created_at DESC LIMIT 50`

                const result = await fastify.db.query(query, params)
                return reply.send(result.rows)
            } catch (err) {
                fastify.log.error(err)
                return reply.status(500).send({
                    error: 'Internal Server Error',
                    message: 'Failed to retrieve production runs'
                })
            }
        }
    })

    /**
    /**
     * PATCH /production-runs/:id/status - Update a run's status.
     * Valid statuses: planned → running → paused / completed → packaging
     */
    fastify.patch('/:id/status', {
        preHandler: [fastify.authenticate, authorizeRole(['admin', 'manager', 'operator'])],
        schema: {
            params: RunIdParamSchema,
            body: UpdateStatusSchema
        },
        handler: async (request, reply) => {
            const { id } = request.params
            const { status, actual_quantity_kg, waste_kg, loss_reason } = request.body

            try {
                // Fetch current status
                const current = await fastify.db.query(
                    'SELECT status FROM production_runs WHERE id = $1',
                    [id]
                )

                if (current.rows.length === 0) {
                    return reply.status(404).send({
                        error: 'Not Found',
                        message: 'Production run not found'
                    })
                }

                const currentStatus = current.rows[0].status

                // Enforce valid state transitions
                const validTransitions: Record<string, string[]> = {
                    planned: ['running'],
                    running: ['paused', 'completed'],
                    paused: ['running', 'completed'],
                    completed: ['packaging'],
                    packaging: []
                }

                const allowed = validTransitions[currentStatus] || []
                if (!allowed.includes(status)) {
                    return reply.status(400).send({
                        error: 'Bad Request',
                        message: `Cannot transition from '${currentStatus}' to '${status}'. Allowed: ${allowed.join(', ') || 'none'}`
                    })
                }

                let client
                try {
                    client = await fastify.db.connect()
                    await client.query('BEGIN')

                    // Compute timestamps to set based on new status
                    let extraFields = ''
                    const queryParams: any[] = [status, id]
                    let paramIdx = 3

                    if (status === 'running') extraFields = `, started_at = CURRENT_TIMESTAMP`
                    if (status === 'completed') {
                        extraFields = `, completed_at = CURRENT_TIMESTAMP`
                        if (actual_quantity_kg !== undefined) {
                            extraFields += `, actual_quantity_kg = $${paramIdx++}`
                            queryParams.push(actual_quantity_kg)
                        }
                        if (waste_kg !== undefined) {
                            extraFields += `, waste_kg = $${paramIdx++}`
                            queryParams.push(waste_kg)
                        }
                        if (loss_reason !== undefined) {
                            extraFields += `, loss_reason = $${paramIdx++}`
                            queryParams.push(loss_reason)
                        }
                    }

                    await client.query(
                        `UPDATE production_runs SET status = $1${extraFields}, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
                        queryParams
                    )

                    // Transitioning to 'completed': finalize actuals & deduct stock
                    if (status === 'completed') {
                        // 1. Ensure actuals exist (auto-populate if nothing provided during planning/running)
                        const currentActuals = await client.query(
                            'SELECT id FROM production_resource_actuals WHERE production_run_id = $1',
                            [id]
                        )

                        if (currentActuals.rows.length === 0) {
                            const runDetails = await client.query(
                                `SELECT pr.formula_id, pr.planned_quantity_kg, pr.actual_quantity_kg, r.batch_size_kg 
                                 FROM production_runs pr 
                                 JOIN formulas r ON pr.formula_id = r.id 
                                 WHERE pr.id = $1`,
                                [id]
                            )
                            if (runDetails.rows.length > 0) {
                                const { formula_id, planned_quantity_kg, actual_quantity_kg: currentActual, batch_size_kg } = runDetails.rows[0]
                                const effectiveActual = actual_quantity_kg ?? currentActual ?? planned_quantity_kg
                                const scaleFactor = batch_size_kg > 0 ? effectiveActual / batch_size_kg : 1

                                const formulaResources = await client.query(
                                    'SELECT resource_id, quantity_required FROM formula_resources WHERE formula_id = $1',
                                    [formula_id]
                                )

                                for (const res of formulaResources.rows) {
                                    const expectedQty = res.quantity_required * scaleFactor
                                    await client.query(
                                        `INSERT INTO production_resource_actuals 
                                         (production_run_id, resource_id, actual_quantity_used, expected_quantity, variance, variance_flag)
                                         VALUES ($1, $2, $3, $4, 0, false)`,
                                        [id, res.resource_id, expectedQty, expectedQty]
                                    )
                                }
                            }
                        }

                        // 2. Perform Stock Deduction (if not already done)
                        // This applies to both auto-populated and manually-edited actuals.
                        const stockCheck = await client.query(
                            `SELECT id FROM resource_stock_transactions WHERE reference_id = $1 AND transaction_type = 'production_usage'`,
                            [id]
                        )
 
                        if (stockCheck.rows.length === 0) {
                            const finalActuals = await client.query(
                                `SELECT ra.resource_id, ra.actual_quantity_used, r.name, r.current_stock
                                 FROM production_resource_actuals ra
                                 JOIN resources r ON ra.resource_id = r.id
                                 WHERE ra.production_run_id = $1`,
                                [id]
                            )
 
                            // Pre-check for stock deficits to avoid generic DB constraint errors
                            const shortages: string[] = []
                            for (const act of finalActuals.rows) {
                                const currentStock = parseFloat(act.current_stock || '0')
                                const neededStock = parseFloat(act.actual_quantity_used || '0')
                                
                                // If current_stock is less than what we need to deduct
                                if (currentStock < neededStock) {
                                    const missing = (neededStock - currentStock).toFixed(2)
                                    shortages.push(`${act.name} (Short ${missing} kg)`)
                                }
                            }
 
                            if (shortages.length > 0) {
                                throw new Error(`Insufficient stock for: ${shortages.join(', ')}`)
                            }
 
                            for (const act of finalActuals.rows) {
                                await client.query(
                                    `INSERT INTO resource_stock_transactions (resource_id, transaction_type, quantity, reference_id, notes)
                                     VALUES ($1, 'production_usage', $2, $3, 'Consumed in Production Run')`,
                                    [act.resource_id, -act.actual_quantity_used, id]
                                )
                            }
                        }
                    }

                    await client.query('COMMIT')
                } catch (err) {
                    if (client) await client.query('ROLLBACK')
                    throw err
                } finally {
                    if (client) client.release()
                }

                return reply.send({
                    message: `Status updated to '${status}'`,
                    production_run_id: id,
                    status
                })
            } catch (err: any) {
                fastify.log.error(err)
                return reply.status(500).send({
                    error: 'Internal Server Error',
                    message: `Failed to update production run status: ${err.message}`
                })
            }
        }
    })

    /**
     * PATCH /production-runs/:id - Edit an active run's details.
     * Accessible by 'admin', 'manager', or 'operator' roles.
     * Can only edit if status is 'planned' or 'running'.
     */
    fastify.patch('/:id', {
        preHandler: [fastify.authenticate, authorizeRole(['admin', 'manager', 'operator'])],
        schema: {
            params: RunIdParamSchema,
            body: EditRunSchema
        },
        handler: async (request, reply) => {
            const { id } = request.params
            const { formulaId, targetQty, operatorId, actualResources } = request.body

            try {
                // Fetch current status
                const current = await fastify.db.query(
                    'SELECT status FROM production_runs WHERE id = $1',
                    [id]
                )

                if (current.rows.length === 0) {
                    return reply.status(404).send({ error: 'Not Found', message: 'Production run not found' })
                }

                const currentStatus = current.rows[0].status

                if (currentStatus !== 'planned' && currentStatus !== 'running') {
                    return reply.status(400).send({
                        error: 'Bad Request',
                        message: `Cannot edit a production run that is '${currentStatus}'`
                    })
                }

                // If formulaId is provided, validate it
                if (formulaId) {
                    const formulaCheck = await fastify.db.query('SELECT id FROM formulas WHERE id = $1', [formulaId])
                    if (formulaCheck.rows.length === 0) {
                        return reply.status(400).send({ error: 'Bad Request', message: 'Invalid formula ID' })
                    }
                }

                // If operatorId is provided, validate it
                if (operatorId) {
                    const opCheck = await fastify.db.query('SELECT id FROM users WHERE id = $1', [operatorId])
                    if (opCheck.rows.length === 0) {
                        return reply.status(400).send({ error: 'Bad Request', message: 'Invalid operator ID' })
                    }
                }

                // Build update query
                const updates: string[] = []
                const params: any[] = []
                let paramIdx = 1

                if (formulaId !== undefined) {
                    updates.push(`formula_id = $${paramIdx++}`)
                    params.push(formulaId)
                }
                if (targetQty !== undefined) {
                    updates.push(`planned_quantity_kg = $${paramIdx++}`)
                    params.push(targetQty)
                }
                if (operatorId !== undefined) {
                    updates.push(`created_by = $${paramIdx++}`)
                    params.push(operatorId)
                }

                if (updates.length > 0) {
                    params.push(id)
                    await fastify.db.query(
                        `UPDATE production_runs SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramIdx}`,
                        params
                    )
                }

                // Handle resource updates if provided
                if (actualResources) {
                    const client = await fastify.db.connect()
                    try {
                        await client.query('BEGIN')
                        
                        // Scale formula to targetQty to get 'expected' quantities for variance tracking
                        const runRes = await client.query(
                            'SELECT formula_id, planned_quantity_kg FROM production_runs WHERE id = $1',
                            [id]
                        )
                        const { formula_id, planned_quantity_kg } = runRes.rows[0]
                        const formulaRes = await client.query('SELECT batch_size_kg FROM formulas WHERE id = $1', [formula_id])
                        const scaleFactor = planned_quantity_kg / formulaRes.rows[0].batch_size_kg

                        // Pre-check stock for edited materials
                        const shortages: string[] = []
                        for (const act of actualResources) {
                            const stockRes = await client.query(
                                'SELECT name, current_stock FROM resources WHERE id = $1',
                                [act.resourceId]
                            )
                            if (stockRes.rows.length > 0) {
                                const resData = stockRes.rows[0]
                                const currentStock = parseFloat(resData.current_stock || '0')
                                const neededStock = act.quantity
                                
                                if (currentStock < neededStock) {
                                    const missing = (neededStock - currentStock).toFixed(2)
                                    shortages.push(`${resData.name} (Short ${missing} kg)`)
                                }
                            }
                        }

                        if (shortages.length > 0) {
                              const stockErr: any = new Error(`Insufficient stock for: ${shortages.join(', ')}`)
                              stockErr.statusCode = 400
                              throw stockErr
                        }

                        for (const act of actualResources) {
                            const erRes = await client.query(
                                'SELECT quantity_required FROM formula_resources WHERE formula_id = $1 AND resource_id = $2',
                                [formula_id, act.resourceId]
                            )
                            const expectedQty = erRes.rows.length > 0 ? (erRes.rows[0].quantity_required * scaleFactor) : 0
                            const variance = act.quantity - expectedQty
                            const varianceFlag = expectedQty > 0 
                                ? (Math.abs(variance / expectedQty) > 0.05) 
                                : (variance !== 0);

                            await client.query(
                                `INSERT INTO production_resource_actuals 
                                 (production_run_id, resource_id, actual_quantity_used, expected_quantity, variance, variance_flag)
                                 VALUES ($1, $2, $3, $4, $5, $6)
                                 ON CONFLICT (production_run_id, resource_id) 
                                 DO UPDATE SET 
                                    actual_quantity_used = EXCLUDED.actual_quantity_used,
                                    expected_quantity = EXCLUDED.expected_quantity,
                                    variance = EXCLUDED.variance,
                                    variance_flag = EXCLUDED.variance_flag`,
                                [id, act.resourceId, act.quantity, expectedQty, variance, varianceFlag]
                            )
                        }
                        await client.query('COMMIT')
                    } catch (err) {
                        await client.query('ROLLBACK')
                        throw err
                    } finally {
                        client.release()
                    }
                }

                return reply.send({
                    message: 'Production run updated successfully',
                    production_run_id: id
                })
            } catch (err: any) {
                fastify.log.error(err)
                const statusCode = err.statusCode || 500
                const errorName = statusCode === 400 ? 'Bad Request' : 'Internal Server Error'
                return reply.status(statusCode).send({
                    error: errorName,
                    message: err.message || 'Failed to update production run'
                })
            }
        }
    })

    /**
     * GET /production-runs/summary - Retrieve production summary metrics.
    /**
     * POST /production-runs - Create a new production run, deducting materials.
     * Only accessible by users with 'admin', 'manager', or 'operator' roles.
     */
    fastify.post('/', {
        preHandler: [fastify.authenticate, authorizeRole(['admin', 'manager', 'operator'])],
        schema: {
            body: CreateProductionRunSchema
        },
        handler: async (request, reply) => {
            const { formulaId, expectedOutput, actualResources } = request.body
            const user = request.user as any
            const user_id = user.id

            let client
            try {
                // Get a dedicated client from the pool for the transaction
                client = await fastify.db.connect()
                await client.query('BEGIN')

                // 1. Fetch the formula to validate it exists and get its batch specifications
                const formulaResult = await client.query(
                    'SELECT id, color_id, batch_size_kg FROM formulas WHERE id = $1',
                    [formulaId]
                )

                if (formulaResult.rows.length === 0) {
                    await client.query('ROLLBACK')
                    return reply.status(404).send({
                        error: 'Not Found',
                        message: 'Valid formula not found'
                    })
                }

                const formula = formulaResult.rows[0]
                const colorId = formula.color_id

                // 2. Fetch expected formula resources to validate the components provided
                const expectedResourcesResult = await client.query(
                    'SELECT resource_id, quantity_required FROM formula_resources WHERE formula_id = $1',
                    [formulaId]
                )
                const expectedResources = expectedResourcesResult.rows
                const expectedResourceIds = expectedResources.map((r: any) => r.resource_id)

                // Validate that all submitted actual resources belong to the formula
                const providedResourceIds = actualResources.map((ar: any) => ar.resourceId)
                const hasInvalidResources = providedResourceIds.some((id: number) => !expectedResourceIds.includes(id))

                if (hasInvalidResources) {
                    await client.query('ROLLBACK')
                    return reply.status(400).send({
                        error: 'Bad Request',
                        message: 'Provided resources do not match the selected formula blueprint'
                    })
                }

                // 3. Create the overarching production run record
                const productionRunResult = await client.query(
                    `INSERT INTO production_runs (formula_id, status, planned_quantity_kg, actual_quantity_kg, started_at, completed_at, created_by) 
                      VALUES ($1, 'completed', $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $4)
                      RETURNING id, created_at`,
                    [formulaId, expectedOutput, expectedOutput, user_id] // assume perfectly yielded run
                )
                const runId = productionRunResult.rows[0].id

                // 4. Iterate over actual resources: track actuals, write stock audit, deduct stock
                const scaleFactor = expectedOutput / formula.batch_size_kg

                for (const actual of actualResources) {
                    // Find expected mapping requirements
                    const expectedRes = expectedResources.find((er: any) => er.resource_id === actual.resourceId)
                    const expectedQuantity = expectedRes ? expectedRes.quantity_required * scaleFactor : 0

                    // Calculate numeric variance
                    const variance = actual.quantity - expectedQuantity
                    // Flag variance exceeding 5% threshold
                    const varianceFlag = expectedQuantity > 0
                        ? Math.abs(variance / expectedQuantity) > 0.05
                        : variance !== 0

                    // a. Record the actual consumption alongside variance tracking
                    await client.query(
                        `INSERT INTO production_resource_actuals 
                         (production_run_id, resource_id, actual_quantity_used, expected_quantity, variance, variance_flag)
                          VALUES ($1, $2, $3, $4, $5, $6)`,
                        [runId, actual.resourceId, actual.quantity, expectedQuantity, variance, varianceFlag]
                    )

                    // b. Audit the stock decrement (trigger auto-updates the resources table)
                    await client.query(
                        `INSERT INTO resource_stock_transactions (resource_id, transaction_type, quantity, reference_id, notes)
                          VALUES ($1, 'production_usage', $2, $3, 'Consumed in Production Run')`,
                        [actual.resourceId, -actual.quantity, runId]
                    )
                }

                // 6. Log the creation in the audit_logs table
                await client.query(
                    `INSERT INTO audit_logs (user_id, action, entity_type, entity_id)
                     VALUES ($1, 'production_created', 'production_run', $2)`,
                    [user_id, runId]
                )

                // Everything successfully applied out, commit
                await client.query('COMMIT')

                return reply.status(201).send({
                    message: 'Production run logged successfully',
                    production_run_id: runId
                })

            } catch (err: any) {
                if (client) {
                    await client.query('ROLLBACK')
                }

                // Catch DB Constraint violation for negative stock bounds
                if (err.code === '23514' || err.message === 'check_violation') {
                    return reply.status(400).send({
                        error: 'Bad Request',
                        message: 'Insufficient raw materials stock exists in inventory to complete this run.'
                    })
                }

                fastify.log.error(err)
                return reply.status(500).send({
                    error: 'Internal Server Error',
                    message: 'Failed to process production run'
                })
            } finally {
                if (client) {
                    client.release()
                }
            }
        }
    })

    /**
     * POST /production-runs/plan - Plan a new production batch with status='planned'.
     * Accessible by 'admin', 'manager', or 'operator' roles.
     */
    fastify.post('/plan', {
        preHandler: [fastify.authenticate, authorizeRole(['admin', 'manager', 'operator'])],
        schema: {
            body: PlanProductionRunSchema
        },
        handler: async (request, reply) => {
            const { formulaId, colorId, targetQty, operatorId, inkSeries, actualResources } = request.body

            try {
                // 1. Validate the formula exists and belongs to the specified color
                const formulaResult = await fastify.db.query(
                    'SELECT id, color_id, batch_size_kg FROM formulas WHERE id = $1 AND color_id = $2',
                    [formulaId, colorId]
                )

                if (formulaResult.rows.length === 0) {
                    return reply.status(404).send({
                        error: 'Not Found',
                        message: 'Formula not found or does not belong to the specified color'
                    })
                }

                const formula = formulaResult.rows[0]

                // 2. Validate operator user exists
                const operatorResult = await fastify.db.query(
                    'SELECT id FROM users WHERE id = $1',
                    [operatorId]
                )

                if (operatorResult.rows.length === 0) {
                    return reply.status(404).send({
                        error: 'Not Found',
                        message: 'Operator user not found'
                    })
                }

                // 3. Pre-check stock for all requested materials
                if (actualResources && actualResources.length > 0) {
                    const shortages: string[] = []
                    for (const act of actualResources) {
                        const stockRes = await fastify.db.query(
                            'SELECT name, current_stock FROM resources WHERE id = $1',
                            [act.resourceId]
                        )
                        if (stockRes.rows.length > 0) {
                            const resData = stockRes.rows[0]
                            const currentStock = parseFloat(resData.current_stock || '0')
                            const neededStock = act.quantity
                            
                            if (currentStock < neededStock) {
                                const missing = (neededStock - currentStock).toFixed(2)
                                shortages.push(`${resData.name} (Short ${missing} kg)`)
                            }
                        }
                    }

                    if (shortages.length > 0) {
                         return reply.status(400).send({
                            error: 'Bad Request',
                            message: `Insufficient stock for: ${shortages.join(', ')}`
                        })
                    }
                }

                // 4. Create the production run with status = 'planned'
                const runResult = await fastify.db.query(
                    `INSERT INTO production_runs
                       (formula_id, status, planned_quantity_kg, created_by, ink_series)
                     VALUES ($1, 'planned', $2, $3, $4)
                     RETURNING id, status, created_at`,
                    [formulaId, targetQty, operatorId, inkSeries ?? null]
                )

                const runId = runResult.rows[0].id

                // 5. Create initial actuals if provided
                if (actualResources) {
                    for (const act of actualResources) {
                        const erRes = await fastify.db.query(
                            'SELECT quantity_required FROM formula_resources WHERE formula_id = $1 AND resource_id = $2',
                            [formulaId, act.resourceId]
                        )
                        const scaleFactor = targetQty / formula.batch_size_kg
                        const expectedQty = erRes.rows.length > 0 ? (erRes.rows[0].quantity_required * scaleFactor) : 0
                        const variance = act.quantity - expectedQty
                        const varianceFlag = expectedQty > 0
                            ? Math.abs(variance / expectedQty) > 0.05
                            : variance !== 0

                        await fastify.db.query(
                            `INSERT INTO production_resource_actuals 
                             (production_run_id, resource_id, actual_quantity_used, expected_quantity, variance, variance_flag)
                             VALUES ($1, $2, $3, $4, $5, $6)`,
                            [runId, act.resourceId, act.quantity, expectedQty, variance, varianceFlag]
                        )
                    }
                }

                // Fetch expected resources to return in the response
                const expectedResourcesResult = await fastify.db.query(`
                    SELECT
                        fr.resource_id,
                        r.name,
                        r.unit,
                        ROUND((fr.quantity_required * $2 / f.batch_size_kg)::numeric, 4) AS expected_quantity
                    FROM formula_resources fr
                    JOIN resources r ON fr.resource_id = r.id
                    JOIN formulas f ON fr.formula_id = f.id
                    WHERE fr.formula_id = $1
                `, [formulaId, targetQty])

                return reply.status(201).send({
                    message: 'Production batch planned successfully',
                    production_run_id: runId,
                    status: 'planned',
                    expected_resources: expectedResourcesResult.rows
                })

            } catch (err) {
                fastify.log.error(err)
                return reply.status(500).send({
                    error: 'Internal Server Error',
                    message: 'Failed to plan production run'
                })
            }
        }
    })

    /**
     * POST /production-runs/:id/packaging - Package the yield of an existing production run.
     * Accessible by 'manager' and 'operator' roles.
     */
    fastify.post('/:id/packaging', {
        preHandler: [fastify.authenticate, authorizeRole(['admin', 'manager', 'operator'])],
        schema: {
            params: RunIdParamSchema,
            body: PackagingDetailsSchema
        },
        handler: async (request, reply) => {
            const { id } = request.params
            const { packaging_details } = request.body

            let client
            try {
                client = await fastify.db.connect()
                await client.query('BEGIN')

                // 1. Fetch current run and validate volume integrity
                const runResult = await client.query(
                    `SELECT pr.actual_quantity_kg, pr.planned_quantity_kg, pr.status, r.color_id 
                      FROM production_runs pr
                      JOIN formulas r ON pr.formula_id = r.id
                      WHERE pr.id = $1`,
                    [id]
                )

                if (runResult.rows.length === 0) {
                    await client.query('ROLLBACK')
                    return reply.status(404).send({ error: 'Not Found', message: 'Production run not found' })
                }

                const { actual_quantity_kg, planned_quantity_kg, status, color_id } = runResult.rows[0]

                // Only allow packaging for completed or partially-packaged runs
                if (status !== 'completed' && status !== 'packaging') {
                    await client.query('ROLLBACK')
                    return reply.status(400).send({
                        error: 'Bad Request',
                        message: `Cannot package a run with status '${status}'. Run must be 'completed' first.`
                    })
                }

                // Ensure we don't package volumes we didn't theoretically produce
                let requestedVolumeKG = 0
                for (const pack of packaging_details) {
                    requestedVolumeKG += (pack.pack_size_kg * pack.quantity_units)
                }

                // Check against actual_quantity. In a real application, you might also query previous packages
                // allocated to this run ID if packaging happens in stages rather than one bulk mapping
                const limitVolume = actual_quantity_kg ?? planned_quantity_kg;
                if (requestedVolumeKG > limitVolume) {
                    await client.query('ROLLBACK')
                    return reply.status(400).send({
                        error: 'Bad Request',
                        message: `Requested packaged volume (${requestedVolumeKG}KG) exceeds production batch limits (${limitVolume}KG).`
                    })
                }

                // 2. Transact Finished Stock
                for (const pack of packaging_details) {
                    // a. Audit tracking explicitly by bucket scale
                    await client.query(
                        `INSERT INTO finished_stock_transactions
                        (color_id, pack_size_kg, transaction_type, quantity_units, quantity_kg, reference_id, notes)
                          VALUES($1, $2, 'production_entry', $3, $4, $5, 'Packaged from Production Run')`,
                        [color_id, pack.pack_size_kg, pack.quantity_units, pack.pack_size_kg * pack.quantity_units, id]
                    )

                    // b. Increment total finished stock count combining composite sizes natively
                    await client.query(
                        `INSERT INTO finished_stock(color_id, pack_size_kg, quantity_units)
                          VALUES($1, $2, $3)
                          ON CONFLICT(color_id, pack_size_kg) 
                          DO UPDATE SET 
                            quantity_units = finished_stock.quantity_units + EXCLUDED.quantity_units,
                        updated_at = CURRENT_TIMESTAMP`,
                        [color_id, pack.pack_size_kg, pack.quantity_units]
                    )
                }

                // 3. Finalize run status to 'packaging'
                await client.query(
                    `UPDATE production_runs SET status = 'packaging', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
                    [id]
                )

                await client.query('COMMIT')

                return reply.status(201).send({
                    message: 'Packaging completed successfully, inventory incremented.'
                })

            } catch (err: any) {
                if (client) {
                    await client.query('ROLLBACK')
                }
                fastify.log.error(err)
                return reply.status(500).send({
                    error: 'Internal Server Error',
                    message: 'Failed to package production run'
                })
            } finally {
                if (client) {
                    client.release()
                }
            }
        }
    })

    /**
     * POST /production-runs/:id/packaging/quick - Package ALL remaining yield of a production run into one entry.
     */
    fastify.post('/:id/packaging/quick', {
        preHandler: [fastify.authenticate, authorizeRole(['admin', 'manager', 'operator'])],
        schema: {
            params: RunIdParamSchema
        },
        handler: async (request, reply) => {
            const { id } = request.params
            let client
            try {
                client = await fastify.db.connect()
                await client.query('BEGIN')

                // 1. Fetch run details and current packaging
                const runRes = await client.query(`
                    SELECT pr.actual_quantity_kg, pr.planned_quantity_kg, r.color_id,
                           (SELECT COALESCE(SUM(pack_size_kg * quantity_units), 0)
                            FROM finished_stock_transactions
                            WHERE reference_id = pr.id AND transaction_type = 'production_entry') as already_packaged
                    FROM production_runs pr
                    JOIN formulas r ON pr.formula_id = r.id
                    WHERE pr.id = $1
                `, [id])

                if (runRes.rows.length === 0) {
                    await client.query('ROLLBACK')
                    return reply.status(404).send({ error: 'Not Found', message: 'Production run not found' })
                }

                const { actual_quantity_kg, planned_quantity_kg, color_id, already_packaged } = runRes.rows[0]
                const yieldVol = actual_quantity_kg ?? planned_quantity_kg
                const remaining = yieldVol - already_packaged

                if (remaining <= 0.01) {
                    await client.query('ROLLBACK')
                    return reply.status(400).send({ error: 'Bad Request', message: 'No remaining volume to pack' })
                }

                // 2. Create one packaging entry for the total remaining
                // Use a default pack size for remaining if it doesn't match standard? 
                // Actually, just record it as one 'custom' pack size entry for now.
                
                await client.query(
                    `INSERT INTO finished_stock_transactions
                    (color_id, pack_size_kg, transaction_type, quantity_units, quantity_kg, reference_id, notes)
                      VALUES($1, $2, 'production_entry', 1, $2, $3, 'Quick Pack Remaining')`,
                    [color_id, remaining, id]
                )

                await client.query(
                    `INSERT INTO finished_stock(color_id, pack_size_kg, quantity_units)
                      VALUES($1, $2, 1)
                      ON CONFLICT(color_id, pack_size_kg) 
                      DO UPDATE SET 
                        quantity_units = finished_stock.quantity_units + 1,
                    updated_at = CURRENT_TIMESTAMP`,
                    [color_id, remaining]
                )

                // 3. Update status to packaging
                await client.query(
                    `UPDATE production_runs SET status = 'packaging', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
                    [id]
                )

                await client.query('COMMIT')
                return reply.send({ message: 'Quick pack successful', remaining_packed: remaining })
            } catch (err) {
                if (client) await client.query('ROLLBACK')
                fastify.log.error(err)
                return reply.status(500).send({ error: 'Internal Server Error' })
            } finally {
                if (client) client.release()
            }
        }
    })
}
