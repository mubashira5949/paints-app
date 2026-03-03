/**
 * Production Module
 * Handles operations related to manufacturing paint and deducting raw materials.
 */

import { FastifyInstance } from 'fastify'
import { authorizeRole } from '../../utils/authorizeRole'

export default async function (fastify: FastifyInstance) {
    /**
     * POST /production-runs - Create a new production run, deducting materials.
     * Only accessible by users with 'admin', 'manager', or 'operator' roles.
     */
    fastify.post('/', {
        // middleware to verify JWT and check user role
        preHandler: [fastify.authenticate, authorizeRole(['admin', 'manager', 'operator'])],
        // request validation schema
        schema: {
            body: {
                type: 'object',
                required: ['recipe_id', 'planned_quantity_liters', 'actual_resources'],
                properties: {
                    recipe_id: { type: 'integer' },
                    planned_quantity_liters: { type: 'number', exclusiveMinimum: 0 },
                    actual_resources: {
                        type: 'array',
                        minItems: 1,
                        items: {
                            type: 'object',
                            required: ['resource_id', 'actual_quantity_used'],
                            properties: {
                                resource_id: { type: 'integer' },
                                actual_quantity_used: { type: 'number', exclusiveMinimum: 0 }
                            }
                        }
                    }
                }
            }
        },
        handler: async (request: any, reply: any) => {
            const { recipe_id, planned_quantity_liters, actual_resources } = request.body
            const user_id = request.user.id

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
                    'SELECT resource_id FROM recipe_resources WHERE recipe_id = $1',
                    [recipe_id]
                )
                const expectedResourceIds = expectedResourcesResult.rows.map(r => r.resource_id)

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
                for (const actual of actual_resources) {
                    // a. Record the actual consumption against the production run
                    await client.query(
                        `INSERT INTO production_resource_actuals (production_run_id, resource_id, actual_quantity_used)
                          VALUES ($1, $2, $3)`,
                        [runId, actual.resource_id, actual.actual_quantity_used]
                    )

                    // b. Audit the stock decrement
                    await client.query(
                        `INSERT INTO resource_stock_transactions (resource_id, transaction_type, quantity, reference_id, notes)
                          VALUES ($1, 'production_usage', $2, $3, 'Consumed in Production Run')`,
                        [actual.resource_id, -actual.actual_quantity_used, runId]
                    )

                    // c. Update current resource inventory
                    await client.query(
                        `UPDATE resources 
                          SET current_stock = current_stock - $1, updated_at = CURRENT_TIMESTAMP
                          WHERE id = $2`,
                        [actual.actual_quantity_used, actual.resource_id]
                    )
                }

                // 5. Update Finished Stock
                // a. Audit the finished goods increment
                await client.query(
                    `INSERT INTO finished_stock_transactions (color_id, transaction_type, quantity_liters, reference_id, notes)
                      VALUES ($1, 'production_entry', $2, $3, 'Generated from Production Run')`,
                    [colorId, 'production_entry', planned_quantity_liters, runId, 'Generated from Production Run']
                )

                // b. Update or Create finished tracking row (UPSERT)
                await client.query(
                    `INSERT INTO finished_stock (color_id, quantity_liters)
                      VALUES ($1, $2)
                      ON CONFLICT (color_id) 
                      DO UPDATE SET 
                        quantity_liters = finished_stock.quantity_liters + EXCLUDED.quantity_liters,
                        updated_at = CURRENT_TIMESTAMP`,
                    [colorId, planned_quantity_liters]
                )

                // Everything successfully applied out, commit
                await client.query('COMMIT')

                return reply.status(201).send({
                    message: 'Production run logged successfully',
                    production_run_id: runId
                })

            } catch (err) {
                if (client) {
                    await client.query('ROLLBACK')
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
}
