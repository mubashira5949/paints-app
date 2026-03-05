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
        recipe_id: Type.Integer(),
        planned_quantity_liters: Type.Number({ exclusiveMinimum: 0 }),
        actual_resources: Type.Array(
            Type.Object({
                resource_id: Type.Integer(),
                actual_quantity_used: Type.Number({ exclusiveMinimum: 0 })
            }),
            { minItems: 1 }
        )
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

    /**
     * GET /production-runs - List recent production runs.
     * Accessible by 'admin', 'manager', or 'operator' roles.
     */
    fastify.get('/', {
        preHandler: [fastify.authenticate, authorizeRole(['admin', 'manager', 'operator'])],
        handler: async (request, reply) => {
            try {
                const result = await fastify.db.query(
                    `SELECT pr.id, pr.status, pr.planned_quantity_liters, pr.actual_quantity_liters, 
                            pr.started_at, pr.completed_at, r.name as recipe_name, c.name as color_name
                     FROM production_runs pr
                     JOIN recipes r ON pr.recipe_id = r.id
                     JOIN colors c ON r.color_id = c.id
                     ORDER BY pr.created_at DESC
                     LIMIT 50`
                )
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
     * POST /production-runs - Create a new production run, deducting materials.
     * Only accessible by users with 'admin', 'manager', or 'operator' roles.
     */
    fastify.post('/', {
        preHandler: [fastify.authenticate, authorizeRole(['admin', 'manager', 'operator'])],
        schema: {
            body: CreateProductionRunSchema
        },
        handler: async (request, reply) => {
            const { recipe_id, planned_quantity_liters, actual_resources } = request.body
            const user = request.user as any
            const user_id = user.id

            let client
            try {
                // Get a dedicated client from the pool for the transaction
                client = await fastify.db.connect()
                await client.query('BEGIN')

                // 1. Fetch the recipe to validate it exists and get its batch specifications
                const recipeResult = await client.query(
                    'SELECT id, color_id, batch_size_liters FROM recipes WHERE id = $1 AND is_active = TRUE',
                    [recipe_id]
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
                    [recipe_id]
                )
                const expectedResources = expectedResourcesResult.rows
                const expectedResourceIds = expectedResources.map(r => r.resource_id)

                // Validate that all submitted actual resources belong to the recipe
                const providedResourceIds = actual_resources.map((ar: any) => ar.resource_id)
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
                    [recipe_id, planned_quantity_liters, planned_quantity_liters, user_id] // assume perfectly yielded run
                )
                const runId = productionRunResult.rows[0].id

                // 4. Iterate over actual resources: track actuals, write stock audit, deduct stock
                const scaleFactor = planned_quantity_liters / recipe.batch_size_liters

                for (const actual of actual_resources) {
                    // Find expected mapping requirements
                    const expectedRes = expectedResources.find(er => er.resource_id === actual.resource_id)
                    const expectedQuantity = expectedRes ? expectedRes.quantity_required * scaleFactor : 0

                    // Calculate numeric variance
                    const variance = actual.actual_quantity_used - expectedQuantity
                    // Flag variance exceeding 5% threshold
                    const varianceFlag = Math.abs(variance / expectedQuantity) > 0.05

                    // a. Record the actual consumption alongside variance tracking
                    await client.query(
                        `INSERT INTO production_resource_actuals 
                         (production_run_id, resource_id, actual_quantity_used, expected_quantity, variance, variance_flag)
                          VALUES ($1, $2, $3, $4, $5, $6)`,
                        [runId, actual.resource_id, actual.actual_quantity_used, expectedQuantity, variance, varianceFlag]
                    )

                    // b. Audit the stock decrement (trigger auto-updates the resources table)
                    await client.query(
                        `INSERT INTO resource_stock_transactions (resource_id, transaction_type, quantity, reference_id, notes)
                          VALUES ($1, 'production_usage', $2, $3, 'Consumed in Production Run')`,
                        [actual.resource_id, -actual.actual_quantity_used, runId]
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
                if (err.code === '23514') {
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
                    `SELECT pr.actual_quantity_liters, pr.status, r.color_id 
                      FROM production_runs pr
                      JOIN recipes r ON pr.recipe_id = r.id
                      WHERE pr.id = $1`,
                    [id]
                )

                if (runResult.rows.length === 0) {
                    await client.query('ROLLBACK')
                    return reply.status(404).send({ error: 'Not Found', message: 'Production run not found' })
                }

                const { actual_quantity_liters, status, color_id } = runResult.rows[0]

                // Ensure we don't package volumes we didn't theoretically produce
                let requestedVolumeLiters = 0
                for (const pack of packaging_details) {
                    requestedVolumeLiters += (pack.pack_size_liters * pack.quantity_units)
                }

                // Check against actual_quantity. In a real application, you might also query previous packages
                // allocated to this run ID if packaging happens in stages rather than one bulk mapping
                if (requestedVolumeLiters > actual_quantity_liters) {
                    await client.query('ROLLBACK')
                    return reply.status(400).send({
                        error: 'Bad Request',
                        message: `Requested packaged volume (${requestedVolumeLiters}L) exceeds actual production batch limits (${actual_quantity_liters}L).`
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
