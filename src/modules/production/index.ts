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
        recipeId: Type.Integer(),
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
        recipeId: Type.Integer(),
        colorId: Type.Integer(),
        targetQty: Type.Number({ exclusiveMinimum: 0 }),
        operatorId: Type.Integer()
    })

    const UpdateStatusSchema = Type.Object({
        status: Type.Union([
            Type.Literal('planned'),
            Type.Literal('running'),
            Type.Literal('paused'),
            Type.Literal('completed'),
            Type.Literal('packaging')
        ])
    })

    const RunIdParamSchema = Type.Object({
        id: Type.Integer()
    })

    const PackagingDetailsSchema = Type.Object({
        packaging_details: Type.Array(
            Type.Object({
                pack_size_liters: Type.Number({ exclusiveMinimum: 0 }),
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
        handler: async (request, reply) => {
            try {
                // 1. Active Runs — anything not completed or packaging
                const activeRunsRes = await fastify.db.query(
                    `SELECT COUNT(*) AS count FROM production_runs
                     WHERE status NOT IN ('completed', 'packaging')`
                )
                const activeRuns = parseInt(activeRunsRes.rows[0].count, 10)

                // 2. Today's Production — sum of actual_quantity_liters for completed runs today
                const todayProductionRes = await fastify.db.query(
                    `SELECT COALESCE(SUM(actual_quantity_liters), 0) AS total
                     FROM production_runs
                     WHERE DATE(created_at) = CURRENT_DATE AND status = 'completed'`
                )
                const todayProduction = parseFloat(todayProductionRes.rows[0].total)

                // 3. Resource Consumption — sum of actual qty used today
                const consumptionRes = await fastify.db.query(
                    `SELECT COALESCE(SUM(pra.actual_quantity_used), 0) AS total
                     FROM production_resource_actuals pra
                     JOIN production_runs pr ON pra.production_run_id = pr.id
                     WHERE DATE(pra.created_at) = CURRENT_DATE`
                )
                const resourceConsumption = parseFloat(consumptionRes.rows[0].total)

                // 4. Variance — (actual - planned) summed for today's completed runs
                const varianceRes = await fastify.db.query(
                    `SELECT COALESCE(SUM(actual_quantity_liters - planned_quantity_liters), 0) AS variance
                     FROM production_runs
                     WHERE DATE(created_at) = CURRENT_DATE AND status = 'completed'`
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
                        pr.planned_quantity_liters,
                        pr.actual_quantity_liters,
                        (COALESCE(pr.actual_quantity_liters, pr.planned_quantity_liters)
                         - pr.planned_quantity_liters) AS variance,
                        pr.started_at,
                        pr.completed_at,
                        pr.created_at,
                        r.name AS recipe_name,
                        c.name AS color_name,
                        (
                            SELECT json_agg(
                                json_build_object(
                                    'pack_size_liters', fst.pack_size_liters,
                                    'quantity_units', fst.quantity_units
                                )
                            )
                            FROM finished_stock_transactions fst
                            WHERE fst.reference_id = pr.id
                              AND fst.transaction_type = 'production_entry'
                        ) AS packaging
                    FROM production_runs pr
                    JOIN recipes r ON pr.recipe_id = r.id
                    JOIN colors c ON r.color_id = c.id
                    WHERE 1=1
                `
                const params: any[] = []

                if (search) {
                    params.push(`%${search}%`)
                    query += ` AND (pr.id::text LIKE $${params.length} OR r.name ILIKE $${params.length} OR c.name ILIKE $${params.length})`
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

                query += ` ORDER BY pr.created_at DESC LIMIT 20`

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
     * GET /production-runs/:id - Full detail for a single production run.
     * Returns recipe, expected resources, actual consumption + variance, packaging, operator.
     * Accessible by 'admin', 'manager', or 'operator' roles.
     */
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
                        pr.planned_quantity_liters,
                        pr.actual_quantity_liters,
                        (COALESCE(pr.actual_quantity_liters, pr.planned_quantity_liters)
                         - pr.planned_quantity_liters) AS variance,
                        pr.started_at,
                        pr.completed_at,
                        pr.created_at,
                        pr.updated_at,
                        r.id AS recipe_id,
                        r.name AS recipe_name,
                        r.version AS recipe_version,
                        r.batch_size_liters,
                        c.name AS color_name,
                        c.color_code,
                        u.username AS operator
                    FROM production_runs pr
                    JOIN recipes r ON pr.recipe_id = r.id
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

                // 2. Expected resources from recipe (scaled to planned qty)
                const expectedResult = await fastify.db.query(`
                    SELECT
                        rr.resource_id,
                        res.name,
                        res.unit,
                        ROUND((rr.quantity_required * $2 / r.batch_size_liters)::numeric, 4) AS expected_qty
                    FROM recipe_resources rr
                    JOIN resources res ON rr.resource_id = res.id
                    JOIN recipes r ON rr.recipe_id = r.id
                    WHERE rr.recipe_id = $1
                `, [run.recipe_id, run.planned_quantity_liters])

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
                    SELECT pack_size_liters, quantity_units,
                           (pack_size_liters * quantity_units) AS volume_liters
                    FROM finished_stock_transactions
                    WHERE reference_id = $1 AND transaction_type = 'production_entry'
                    ORDER BY pack_size_liters
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
                    SELECT pr.id, pr.status, pr.planned_quantity_liters, pr.actual_quantity_liters, 
                           pr.started_at, pr.completed_at, pr.created_at, r.name as recipe_name, c.name as color_name,
                           (SELECT json_agg(json_build_object('pack_size_liters', fst.pack_size_liters, 'quantity_units', fst.quantity_units))
                            FROM finished_stock_transactions fst
                            WHERE fst.reference_id = pr.id AND fst.transaction_type = 'production_entry'
                           ) as packaging
                    FROM production_runs pr
                    JOIN recipes r ON pr.recipe_id = r.id
                    JOIN colors c ON r.color_id = c.id
                    WHERE 1=1
                `
                const params: any[] = []

                if (search) {
                    params.push(`%${search}%`)
                    query += ` AND (pr.id::text LIKE $${params.length} OR r.name ILIKE $${params.length} OR c.name ILIKE $${params.length})`
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
                        r.name AS recipe,
                        pr.planned_quantity_liters AS "targetQty",
                        pr.status,
                        pr.started_at,
                        pr.created_at,
                        u.username AS operator
                    FROM production_runs pr
                    JOIN recipes r ON pr.recipe_id = r.id
                    JOIN colors c ON r.color_id = c.id
                    LEFT JOIN users u ON pr.created_by = u.id
                    WHERE pr.status NOT IN ('completed')
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
            const { status } = request.body

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

                // Compute timestamps to set based on new status
                let extraFields = ''
                if (status === 'running') extraFields = `, started_at = CURRENT_TIMESTAMP`
                if (status === 'completed') extraFields = `, completed_at = CURRENT_TIMESTAMP`

                await fastify.db.query(
                    `UPDATE production_runs SET status = $1${extraFields}, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
                    [status, id]
                )

                return reply.send({
                    message: `Status updated to '${status}'`,
                    production_run_id: id,
                    status
                })
            } catch (err) {
                fastify.log.error(err)
                return reply.status(500).send({
                    error: 'Internal Server Error',
                    message: 'Failed to update production run status'
                })
            }
        }
    })

    /**
     * GET /production-runs/summary - Retrieve production summary metrics.
     * Accessible by 'admin', 'manager', or 'operator' roles.
     */
    fastify.get('/summary', {
        preHandler: [fastify.authenticate, authorizeRole(['admin', 'manager', 'operator'])],
        handler: async (request, reply) => {
            try {
                // 1. Active Runs
                const activeRunsRes = await fastify.db.query(
                    `SELECT COUNT(*) as count FROM production_runs WHERE status != 'completed'`
                )
                const activeRuns = parseInt(activeRunsRes.rows[0].count, 10)

                // 2. Today's Production (Yield)
                const todaysProductionRes = await fastify.db.query(
                    `SELECT SUM(actual_quantity_liters) as total 
                     FROM production_runs 
                     WHERE DATE(created_at) = CURRENT_DATE AND status = 'completed'`
                )
                const todaysProduction = parseFloat(todaysProductionRes.rows[0].total || '0')

                // 3. Resource Consumption (Today)
                const todaysConsumptionRes = await fastify.db.query(
                    `SELECT SUM(pra.actual_quantity_used) as total 
                     FROM production_resource_actuals pra
                     JOIN production_runs pr ON pra.production_run_id = pr.id
                     WHERE DATE(pra.created_at) = CURRENT_DATE`
                )
                const resourceConsumption = parseFloat(todaysConsumptionRes.rows[0].total || '0')

                // 4. Production Variance
                const varianceRes = await fastify.db.query(
                    `SELECT SUM(expected_quantity) as total_expected, SUM(actual_quantity_used) as total_actual
                     FROM production_resource_actuals pra
                     JOIN production_runs pr ON pra.production_run_id = pr.id
                     WHERE DATE(pra.created_at) = CURRENT_DATE`
                )
                const totalExpected = parseFloat(varianceRes.rows[0].total_expected || '0')
                const totalActual = parseFloat(varianceRes.rows[0].total_actual || '0')

                let variancePercentage = 0;
                if (totalExpected > 0) {
                    variancePercentage = ((totalActual - totalExpected) / totalExpected) * 100;
                }

                return reply.send({
                    active_runs: activeRuns,
                    todays_production_liters: todaysProduction,
                    resource_consumption_kg: resourceConsumption, // Assuming standard metric mix is kg/liters
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
            const { recipeId, expectedOutput, actualResources } = request.body
            const user = request.user as any
            const user_id = user.id

            let client
            try {
                // Get a dedicated client from the pool for the transaction
                client = await fastify.db.connect()
                await client.query('BEGIN')

                // 1. Fetch the recipe to validate it exists and get its batch specifications
                const recipeResult = await client.query(
                    'SELECT id, color_id, batch_size_liters FROM recipes WHERE id = $1',
                    [recipeId]
                )

                if (recipeResult.rows.length === 0) {
                    await client.query('ROLLBACK')
                    return reply.status(404).send({
                        error: 'Not Found',
                        message: 'Valid recipe not found'
                    })
                }

                const recipe = recipeResult.rows[0]
                const colorId = recipe.color_id

                // 2. Fetch expected recipe resources to validate the components provided
                const expectedResourcesResult = await client.query(
                    'SELECT resource_id, quantity_required FROM recipe_resources WHERE recipe_id = $1',
                    [recipeId]
                )
                const expectedResources = expectedResourcesResult.rows
                const expectedResourceIds = expectedResources.map((r: any) => r.resource_id)

                // Validate that all submitted actual resources belong to the recipe
                const providedResourceIds = actualResources.map((ar: any) => ar.resourceId)
                const hasInvalidResources = providedResourceIds.some((id: number) => !expectedResourceIds.includes(id))

                if (hasInvalidResources) {
                    await client.query('ROLLBACK')
                    return reply.status(400).send({
                        error: 'Bad Request',
                        message: 'Provided resources do not match the selected recipe blueprint'
                    })
                }

                // 3. Create the overarching production run record
                const productionRunResult = await client.query(
                    `INSERT INTO production_runs (recipe_id, status, planned_quantity_liters, actual_quantity_liters, started_at, completed_at, created_by) 
                      VALUES ($1, 'completed', $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $4)
                      RETURNING id, created_at`,
                    [recipeId, expectedOutput, expectedOutput, user_id] // assume perfectly yielded run
                )
                const runId = productionRunResult.rows[0].id

                // 4. Iterate over actual resources: track actuals, write stock audit, deduct stock
                const scaleFactor = expectedOutput / recipe.batch_size_liters

                for (const actual of actualResources) {
                    // Find expected mapping requirements
                    const expectedRes = expectedResources.find((er: any) => er.resource_id === actual.resourceId)
                    const expectedQuantity = expectedRes ? expectedRes.quantity_required * scaleFactor : 0

                    // Calculate numeric variance
                    const variance = actual.quantity - expectedQuantity
                    // Flag variance exceeding 5% threshold
                    const varianceFlag = Math.abs(variance / expectedQuantity) > 0.05

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
            const { recipeId, colorId, targetQty, operatorId } = request.body

            try {
                // 1. Validate the recipe exists and belongs to the specified color
                const recipeResult = await fastify.db.query(
                    'SELECT id, color_id, batch_size_liters FROM recipes WHERE id = $1 AND color_id = $2',
                    [recipeId, colorId]
                )

                if (recipeResult.rows.length === 0) {
                    return reply.status(404).send({
                        error: 'Not Found',
                        message: 'Recipe not found or does not belong to the specified color'
                    })
                }

                const recipe = recipeResult.rows[0]

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

                // 3. Create the production run with status = 'planned'
                const runResult = await fastify.db.query(
                    `INSERT INTO production_runs
                       (recipe_id, status, planned_quantity_liters, created_by)
                     VALUES ($1, 'planned', $2, $3)
                     RETURNING id, status, created_at`,
                    [recipeId, targetQty, operatorId]
                )

                const runId = runResult.rows[0].id

                // 4. Fetch expected resources, scaled to the requested targetQty
                const resourcesResult = await fastify.db.query(
                    `SELECT rr.resource_id, r.name, r.unit,
                            ROUND((rr.quantity_required * $2 / $3)::numeric, 4) AS expected_quantity
                     FROM recipe_resources rr
                     JOIN resources r ON rr.resource_id = r.id
                     WHERE rr.recipe_id = $1`,
                    [recipeId, targetQty, recipe.batch_size_liters]
                )

                return reply.status(201).send({
                    message: 'Production batch planned successfully',
                    production_run_id: runId,
                    status: 'planned',
                    expected_resources: resourcesResult.rows
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
                    `SELECT pr.actual_quantity_liters, pr.planned_quantity_liters, pr.status, r.color_id 
                      FROM production_runs pr
                      JOIN recipes r ON pr.recipe_id = r.id
                      WHERE pr.id = $1`,
                    [id]
                )

                if (runResult.rows.length === 0) {
                    await client.query('ROLLBACK')
                    return reply.status(404).send({ error: 'Not Found', message: 'Production run not found' })
                }

                const { actual_quantity_liters, planned_quantity_liters, status, color_id } = runResult.rows[0]

                // Ensure we don't package volumes we didn't theoretically produce
                let requestedVolumeLiters = 0
                for (const pack of packaging_details) {
                    requestedVolumeLiters += (pack.pack_size_liters * pack.quantity_units)
                }

                // Check against actual_quantity. In a real application, you might also query previous packages
                // allocated to this run ID if packaging happens in stages rather than one bulk mapping
                const limitVolume = actual_quantity_liters ?? planned_quantity_liters;
                if (requestedVolumeLiters > limitVolume) {
                    await client.query('ROLLBACK')
                    return reply.status(400).send({
                        error: 'Bad Request',
                        message: `Requested packaged volume (${requestedVolumeLiters}L) exceeds production batch limits (${limitVolume}L).`
                    })
                }

                // 2. Transact Finished Stock
                for (const pack of packaging_details) {
                    // a. Audit tracking explicitly by bucket scale
                    await client.query(
                        `INSERT INTO finished_stock_transactions
                        (color_id, pack_size_liters, transaction_type, quantity_units, quantity_liters, reference_id, notes)
                          VALUES($1, $2, 'production_entry', $3, $4, $5, 'Packaged from Production Run')`,
                        [color_id, pack.pack_size_liters, pack.quantity_units, pack.pack_size_liters * pack.quantity_units, id]
                    )

                    // b. Increment total finished stock count combining composite sizes natively
                    await client.query(
                        `INSERT INTO finished_stock(color_id, pack_size_liters, quantity_units)
                          VALUES($1, $2, $3)
                          ON CONFLICT(color_id, pack_size_liters) 
                          DO UPDATE SET 
                            quantity_units = finished_stock.quantity_units + EXCLUDED.quantity_units,
                        updated_at = CURRENT_TIMESTAMP`,
                        [color_id, pack.pack_size_liters, pack.quantity_units]
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
}
