/**
 * Formulas Module
 * Handles operations related to paint formulas and their bill of materials.
 */

import { FastifyInstance } from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'
import { authorizeRole } from '../../utils/authorizeRole'

export default async function (fastifyRaw: FastifyInstance) {
    const fastify = fastifyRaw.withTypeProvider<TypeBoxTypeProvider>()

    const ColorIdParamSchema = Type.Object({
        colorId: Type.Integer()
    })

    const CreateFormulaSchema = Type.Object({
        color_id: Type.Integer(),
        name: Type.String(),
        version: Type.Optional(Type.String({ default: '1.0.0' })),
        batch_size_kg: Type.Number(),
        resources: Type.Array(
            Type.Object({
                resource_id: Type.Integer(),
                quantity_required: Type.Number()
            }),
            { minItems: 1 }
        )
    })

    const UpdateFormulaSchema = Type.Object({
        name: Type.Optional(Type.String()),
        version: Type.Optional(Type.String()),
        batch_size_kg: Type.Optional(Type.Number()),
        resources: Type.Optional(
            Type.Array(
                Type.Object({
                    resource_id: Type.Integer(),
                    quantity_required: Type.Number()
                }),
                { minItems: 1 }
            )
        )
    })

    const FormulaIdParamSchema = Type.Object({
        id: Type.Integer()
    })

    const AddResourceSchema = Type.Object({
        resource_id: Type.Integer(),
        quantity_required: Type.Number({ exclusiveMinimum: 0 })
    })

    /**
     * GET /formulas/:colorId - Retrieve active formulas for a specific color.
     * Accessible to all authenticated users.
     */
    fastify.get('/:colorId', {
        preHandler: [fastify.authenticate],
        schema: {
            params: ColorIdParamSchema
        },
        handler: async (request, reply) => {
            const { colorId } = request.params

            try {
                // Fetch the formulas
                const formulasResult = await fastify.db.query(
                    `SELECT id, name, version, batch_size_kg, created_at, updated_at 
                     FROM formulas 
                     WHERE color_id = $1 AND is_active = TRUE 
                     ORDER BY created_at DESC`,
                    [colorId]
                )

                if (formulasResult.rows.length === 0) {
                    return reply.send([])
                }

                const formulas = formulasResult.rows

                // Fetch the resources for all these formulas
                const formulaIds = formulas.map(r => r.id)

                const resourcesResult = await fastify.db.query(
                    `SELECT rr.formula_id, rr.resource_id, r.name, r.unit, rr.quantity_required
                     FROM formula_resources rr
                     JOIN resources r ON rr.resource_id = r.id
                     WHERE rr.formula_id = ANY($1::int[])`,
                    [formulaIds]
                )

                // Group resources by formula_id
                const resourcesByFormula: { [key: number]: any[] } = {}
                resourcesResult.rows.forEach(resource => {
                    if (!resourcesByFormula[resource.formula_id]) {
                        resourcesByFormula[resource.formula_id] = []
                    }
                    resourcesByFormula[resource.formula_id].push({
                        resource_id: resource.resource_id,
                        name: resource.name,
                        unit: resource.unit,
                        quantity_required: resource.quantity_required
                    })
                })

                // Attach resources to their respective formulas
                const fullFormulas = formulas.map(formula => ({
                    ...formula,
                    resources: resourcesByFormula[formula.id] || []
                }))

                return reply.send(fullFormulas)
            } catch (err) {
                fastify.log.error(err)
                return reply.status(500).send({
                    error: 'Internal Server Error',
                    message: 'Failed to retrieve formulas'
                })
            }
        }
    })

    /**
     * POST /formulas - Create a new formula and its bill of materials.
     * Only accessible by users with 'admin' or 'manager' roles.
     */
    fastify.post('/', {
        preHandler: [fastify.authenticate, authorizeRole(['admin', 'manager'])],
        schema: {
            body: CreateFormulaSchema
        },
        handler: async (request, reply) => {
            const { color_id, name, version, batch_size_kg, resources } = request.body

            // We need a transaction block to ensure both the formula and its resources are safely committed.
            let client
            try {
                // Get a dedicated client from the pool for the transaction
                client = await fastify.db.connect()
                await client.query('BEGIN')

                // 1. Insert the new formula
                const formulaResult = await client.query(
                    `INSERT INTO formulas (color_id, name, version, batch_size_kg) 
                     VALUES ($1, $2, $3, $4) 
                     RETURNING id, color_id, name, version, batch_size_kg, is_active, created_at`,
                    [color_id, name, version || '1.0.0', batch_size_kg]
                )

                const newFormula = formulaResult.rows[0]

                // 2. Insert the formula's resources (Bill of Materials)
                for (const res of resources) {
                    await client.query(
                        `INSERT INTO formula_resources (formula_id, resource_id, quantity_required) 
                         VALUES ($1, $2, $3)`,
                        [newFormula.id, res.resource_id, res.quantity_required]
                    )
                }

                // 3. Log the creation in the audit_logs table
                const user = request.user as any
                await client.query(
                    `INSERT INTO audit_logs (user_id, action, entity_type, entity_id)
                     VALUES ($1, 'formula_created', 'formula', $2)`,
                    [user.id, newFormula.id]
                )

                // 5. Commit Transaction
                await client.query('COMMIT')

                return reply.status(201).send({
                    message: 'Formula created successfully',
                    formula: {
                        ...newFormula,
                        resources: resources
                    }
                })
            } catch (err: any) {
                // If any error occurs, rollback the changes
                if (client) {
                    await client.query('ROLLBACK')
                }

                // Handle duplicate unique constraint violations from DB if needed
                if (err.code === '23505') {
                    return reply.status(400).send({
                        error: 'Bad Request',
                        message: 'A duplicate entry exists (e.g., duplicated resource in formula)'
                    })
                }

                // Check for foreign key constraint violation (e.g. invalid color_id or resource_id)
                if (err.code === '23503') {
                    return reply.status(400).send({
                        error: 'Bad Request',
                        message: 'Invalid color_id or resource_id provided'
                    })
                }

                fastify.log.error(err)
                return reply.status(500).send({
                    error: 'Internal Server Error',
                    message: 'Failed to create formula'
                })
            } finally {
                // Always release the client back to the pool
                if (client) {
                    client.release()
                }
            }
        }
    })

    /**
     * POST /formulas/:id/resources - Add a resource to an existing formula.
     * Only accessible by users with 'admin' or 'manager' roles.
     */
    fastify.post('/:id/resources', {
        preHandler: [fastify.authenticate, authorizeRole(['admin', 'manager'])],
        schema: {
            params: FormulaIdParamSchema,
            body: AddResourceSchema
        },
        handler: async (request, reply) => {
            const { id } = request.params
            const { resource_id, quantity_required } = request.body

            try {
                // 1. Validate that the formula exists
                const formulaCheck = await fastify.db.query(
                    'SELECT id FROM formulas WHERE id = $1',
                    [id]
                )
                if (formulaCheck.rows.length === 0) {
                    return reply.status(404).send({
                        error: 'Not Found',
                        message: 'Formula not found'
                    })
                }

                // 2. Validate that the resource exists
                const resourceCheck = await fastify.db.query(
                    'SELECT id FROM resources WHERE id = $1',
                    [resource_id]
                )
                if (resourceCheck.rows.length === 0) {
                    return reply.status(404).send({
                        error: 'Not Found',
                        message: 'Resource not found'
                    })
                }

                // 3. Insert the resource link (Bill of Materials entry)
                const result = await fastify.db.query(
                    `INSERT INTO formula_resources (formula_id, resource_id, quantity_required) 
                     VALUES ($1, $2, $3) 
                     RETURNING id, formula_id, resource_id, quantity_required`,
                    [id, resource_id, quantity_required]
                )

                return reply.status(201).send({
                    message: 'Resource added to formula successfully',
                    formula_resource: result.rows[0]
                })

            } catch (err: any) {
                // Catch unique constraint violation (e.g., resource_id already mapped to this formula_id)
                if (err.code === '23505') {
                    return reply.status(400).send({
                        error: 'Bad Request',
                        message: 'This resource is already added to the specified formula'
                    })
                }

                fastify.log.error(err)
                return reply.status(500).send({
                    error: 'Internal Server Error',
                    message: 'Failed to add resource to formula'
                })
            }
        }
    })

    /**
     * PUT /formulas/:id - Update an existing formula
     * Only accessible by 'admin' or 'manager' roles.
     */
    fastify.put('/:id', {
        preHandler: [fastify.authenticate, authorizeRole(['admin', 'manager'])],
        schema: {
            params: FormulaIdParamSchema,
            body: UpdateFormulaSchema
        },
        handler: async (request, reply) => {
            const { id } = request.params
            const { name, version, batch_size_kg, resources } = request.body

            let client
            try {
                client = await fastify.db.connect()
                await client.query('BEGIN')

                // Update formula core fields
                const updates: string[] = []
                const values: any[] = []
                let paramIdx = 1

                if (name !== undefined) {
                    updates.push(`name = $${paramIdx++}`)
                    values.push(name)
                }
                if (version !== undefined) {
                    updates.push(`version = $${paramIdx++}`)
                    values.push(version)
                }
                if (batch_size_kg !== undefined) {
                    updates.push(`batch_size_kg = $${paramIdx++}`)
                    values.push(batch_size_kg)
                }

                if (updates.length > 0) {
                    updates.push(`updated_at = CURRENT_TIMESTAMP`)
                    values.push(id)
                    const updateQuery = `UPDATE formulas SET ${updates.join(', ')} WHERE id = $${paramIdx}`
                    await client.query(updateQuery, values)
                }

                // Update resources if provided
                if (resources !== undefined) {
                    // First, delete current resources for this formula
                    await client.query('DELETE FROM formula_resources WHERE formula_id = $1', [id])

                    // Insert the new ones
                    for (const res of resources) {
                        await client.query(
                            `INSERT INTO formula_resources (formula_id, resource_id, quantity_required) 
                             VALUES ($1, $2, $3)`,
                            [id, res.resource_id, res.quantity_required]
                        )
                    }
                }

                const user = request.user as any
                await client.query(
                    `INSERT INTO audit_logs (user_id, action, entity_type, entity_id)
                     VALUES ($1, 'formula_updated', 'formula', $2)`,
                    [user.id, id]
                )

                await client.query('COMMIT')
                
                return reply.send({
                    message: 'Formula updated successfully'
                })
            } catch (err: any) {
                if (client) await client.query('ROLLBACK')
                if (err.code === '23505') {
                    return reply.status(400).send({
                        error: 'Bad Request',
                        message: 'A duplicate entry exists (e.g., duplicated resource in formula)'
                    })
                }
                fastify.log.error(err)
                return reply.status(500).send({
                    error: 'Internal Server Error',
                    message: 'Failed to update formula'
                })
            } finally {
                if (client) client.release()
            }
        }
    })

    /**
     * DELETE /formulas/:id - Delete a formula
     * Only accessible by 'admin' or 'manager' roles.
     */
    fastify.delete('/:id', {
        preHandler: [fastify.authenticate, authorizeRole(['admin', 'manager'])],
        schema: {
            params: FormulaIdParamSchema
        },
        handler: async (request, reply) => {
            const { id } = request.params
            let client
            try {
                client = await fastify.db.connect()
                await client.query('BEGIN')

                // Get the color_id before deleting
                const formulaResult = await client.query('SELECT color_id FROM formulas WHERE id = $1', [id])
                if (formulaResult.rows.length === 0) {
                    await client.query('ROLLBACK')
                    return reply.status(404).send({
                        error: 'Not Found',
                        message: 'Formula not found'
                    })
                }
                const colorId = formulaResult.rows[0].color_id

                // Find other formulas for this color and wipe out associated data
                const otherFormulas = await client.query('SELECT id FROM formulas WHERE color_id = $1', [colorId])
                for (const row of otherFormulas.rows) {
                    const formulaId = row.id
                    
                    // Find and delete all production runs using this formula
                    const runsResult = await client.query('SELECT id FROM production_runs WHERE formula_id = $1', [formulaId])
                    for (const runRow of runsResult.rows) {
                        const runId = runRow.id
                        // Clean up child dependencies of the production run
                        await client.query('DELETE FROM production_resource_actuals WHERE production_run_id = $1', [runId])
                        await client.query("DELETE FROM finished_stock_transactions WHERE reference_id = $1 AND transaction_type = 'production_entry'", [runId])
                        await client.query("DELETE FROM resource_stock_transactions WHERE reference_id = $1 AND transaction_type = 'production_usage'", [runId])
                        // Delete the run itself
                        await client.query('DELETE FROM production_runs WHERE id = $1', [runId])
                    }

                    // Delete the formula resources mapping
                    await client.query('DELETE FROM formula_resources WHERE formula_id = $1', [formulaId])
                }

                // Delete all finished stock and general transactions for this color
                await client.query('DELETE FROM finished_stock_transactions WHERE color_id = $1', [colorId])
                await client.query('DELETE FROM finished_stock WHERE color_id = $1', [colorId])
                
                // Delete all formulas for this color
                await client.query('DELETE FROM formulas WHERE color_id = $1', [colorId])

                // Delete the color itself
                await client.query('DELETE FROM colors WHERE id = $1', [colorId])

                const user = request.user as any
                await client.query(
                    `INSERT INTO audit_logs (user_id, action, entity_type, entity_id)
                      VALUES ($1, 'formula_deleted_cascade_color', 'formula', $2)`,
                    [user.id, id]
                )

                await client.query('COMMIT')
                return reply.send({
                    message: 'Formula and its associated color deleted successfully'
                })
            } catch (err: any) {
                if (client) await client.query('ROLLBACK')
                if (err.code === '23503') {
                    return reply.status(400).send({
                        error: 'Bad Request',
                        message: `Cannot delete: the formula or color is locked by existing data. Detail: ${err.detail || 'None available'}`
                    })
                }
                fastify.log.error(err)
                return reply.status(500).send({
                    error: 'Internal Server Error',
                    message: 'Failed to delete formula and color'
                })
            } finally {
                if (client) client.release()
            }
        }
    })
}
