/**
 * Colors Module
 * Handles operations related to paint colors.
 */

import { FastifyInstance } from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'
import { authorizeRole } from '../../utils/authorizeRole'

export default async function (fastifyRaw: FastifyInstance) {
    const fastify = fastifyRaw.withTypeProvider<TypeBoxTypeProvider>()

    const CreateColorSchema = Type.Object({
        name: Type.String(),
        color_code: Type.Optional(Type.String()),
        description: Type.Optional(Type.String())
    })

    const UpdateColorSchema = Type.Object({
        name: Type.Optional(Type.String()),
        color_code: Type.Optional(Type.String()),
        description: Type.Optional(Type.String())
    })

    const ColorIdParamSchema = Type.Object({
        id: Type.Integer()
    })

    /**
     * GET /colors - Retrieve all colors.
     * Accessible to all authenticated users.
     */
    fastify.get('/', {
        preHandler: [fastify.authenticate],
        handler: async (request, reply) => {
            try {
                const result = await fastify.db.query(
                    'SELECT id, name, color_code, description, created_at, updated_at FROM colors ORDER BY created_at DESC'
                )

                return reply.send(result.rows)
            } catch (err) {
                fastify.log.error(err)
                return reply.status(500).send({
                    error: 'Internal Server Error',
                    message: 'Failed to retrieve colors'
                })
            }
        }
    })

    /**
     * POST /colors - Create a new color.
     * Only accessible by users with 'admin' or 'manager' roles.
     */
    fastify.post('/', {
        preHandler: [fastify.authenticate, authorizeRole(['admin', 'manager'])],
        schema: {
            body: CreateColorSchema
        },
        handler: async (request, reply) => {
            const { name, color_code, description } = request.body
            const client = await fastify.db.connect() // Get a client from the pool

            try {
                await client.query('BEGIN') // Start transaction

                // Create the color entry
                const insertResult = await client.query(
                    'INSERT INTO colors (name, color_code, description) VALUES ($1, $2, $3) RETURNING *',
                    [name, color_code, description]
                )
                const newColor = insertResult.rows[0]

                // Log the creation in the audit_logs table
                const user = request.user as any
                await client.query(
                    `INSERT INTO audit_logs (user_id, action, entity_type, entity_id)
                     VALUES ($1, 'color_created', 'color', $2)`,
                    [user.id, newColor.id]
                )

                await client.query('COMMIT') // Commit transaction

                return reply.status(201).send({
                    message: 'Color created successfully',
                    color: newColor
                })
            } catch (err: any) {
                await client.query('ROLLBACK')
                if (err.code === '23505') { // Unique violation Postgres
                    return reply.status(400).send({
                        error: 'Bad Request',
                        message: 'A color with this name already exists'
                    })
                }
                fastify.log.error(err)
                return reply.status(500).send({
                    error: 'Internal Server Error',
                    message: 'Failed to create color'
                })
            } finally {
                client.release()
            }
        }
    })

    /**
     * PUT /colors/:id - Update an existing color.
     * Only accessible by 'admin' or 'manager' roles.
     */
    fastify.put('/:id', {
        preHandler: [fastify.authenticate, authorizeRole(['admin', 'manager'])],
        schema: {
            params: ColorIdParamSchema,
            body: UpdateColorSchema
        },
        handler: async (request, reply) => {
            const { id } = request.params
            const { name, color_code, description } = request.body

            try {
                const updates: string[] = []
                const values: any[] = []
                let paramIdx = 1

                if (name !== undefined) {
                    updates.push(`name = $${paramIdx++}`)
                    values.push(name)
                }
                if (color_code !== undefined) {
                    updates.push(`color_code = $${paramIdx++}`)
                    values.push(color_code)
                }
                if (description !== undefined) {
                    updates.push(`description = $${paramIdx++}`)
                    values.push(description)
                }

                if (updates.length === 0) {
                    const existing = await fastify.db.query('SELECT * FROM colors WHERE id = $1', [id])
                    if (existing.rows.length === 0) {
                        return reply.status(404).send({ error: 'Not Found', message: 'Color not found' })
                    }
                    return reply.send(existing.rows[0])
                }

                updates.push(`updated_at = CURRENT_TIMESTAMP`)
                values.push(id)

                const updateQuery = `UPDATE colors SET ${updates.join(', ')} WHERE id = $${paramIdx} RETURNING *`
                const updateResult = await fastify.db.query(updateQuery, values)

                if (updateResult.rows.length === 0) {
                    return reply.status(404).send({
                        error: 'Not Found',
                        message: 'Color not found'
                    })
                }

                const user = request.user as any
                await fastify.db.query(
                    `INSERT INTO audit_logs (user_id, action, entity_type, entity_id)
                     VALUES ($1, 'color_updated', 'color', $2)`,
                    [user.id, id]
                )

                return reply.send({
                    message: 'Color updated successfully',
                    color: updateResult.rows[0]
                })

            } catch (err: any) {
                if (err.code === '23505') {
                    return reply.status(400).send({
                        error: 'Bad Request',
                        message: 'A color with this name already exists'
                    })
                }
                fastify.log.error(err)
                return reply.status(500).send({
                    error: 'Internal Server Error',
                    message: 'Failed to update color'
                })
            }
        }
    })

    /**
     * DELETE /colors/:id - Delete a color
     * Only accessible by 'admin' or 'manager' roles.
     */
    fastify.delete('/:id', {
        preHandler: [fastify.authenticate, authorizeRole(['admin', 'manager'])],
        schema: {
            params: ColorIdParamSchema
        },
        handler: async (request, reply) => {
            const { id } = request.params
            let client
            try {
                client = await fastify.db.connect()
                await client.query('BEGIN')

                // Find all recipes for this color and wipe out associated data
                const recipesResult = await client.query('SELECT id FROM recipes WHERE color_id = $1', [id])
                for (const row of recipesResult.rows) {
                    const recipeId = row.id
                    
                    // Find and delete all production runs using this recipe
                    const runsResult = await client.query('SELECT id FROM production_runs WHERE recipe_id = $1', [recipeId])
                    for (const runRow of runsResult.rows) {
                        const runId = runRow.id
                        // Clean up child dependencies of the production run
                        await client.query('DELETE FROM production_resource_actuals WHERE production_run_id = $1', [runId])
                        await client.query("DELETE FROM finished_stock_transactions WHERE reference_id = $1 AND transaction_type = 'production_entry'", [runId])
                        await client.query("DELETE FROM resource_stock_transactions WHERE reference_id = $1 AND transaction_type = 'production_usage'", [runId])
                        // Delete the run itself
                        await client.query('DELETE FROM production_runs WHERE id = $1', [runId])
                    }

                    // Delete the recipe resources mapping
                    await client.query('DELETE FROM recipe_resources WHERE recipe_id = $1', [recipeId])
                }

                // Delete all finished stock and general transactions for this color
                await client.query('DELETE FROM finished_stock_transactions WHERE color_id = $1', [id])
                await client.query('DELETE FROM finished_stock WHERE color_id = $1', [id])
                
                // Delete the recipes
                await client.query('DELETE FROM recipes WHERE color_id = $1', [id])

                const deleteResult = await client.query(
                    'DELETE FROM colors WHERE id = $1 RETURNING id',
                    [id]
                )

                if (deleteResult.rows.length === 0) {
                    await client.query('ROLLBACK')
                    return reply.status(404).send({
                        error: 'Not Found',
                        message: 'Color not found'
                    })
                }

                const user = request.user as any
                await client.query(
                    `INSERT INTO audit_logs (user_id, action, entity_type, entity_id)
                      VALUES ($1, 'color_deleted', 'color', $2)`,
                    [user.id, id]
                )

                await client.query('COMMIT')
                return reply.send({
                    message: 'Color and associated recipes deleted successfully'
                })
            } catch (err: any) {
                if (client) await client.query('ROLLBACK')
                if (err.code === '23503') {
                    return reply.status(400).send({
                        error: 'Bad Request',
                        message: `Cannot delete color: it is locked by existing data. Detail: ${err.detail || 'None available'}`
                    })
                }
                fastify.log.error(err)
                return reply.status(500).send({
                    error: 'Internal Server Error',
                    message: 'Failed to delete color'
                })
            } finally {
                if (client) client.release()
            }
        }
    })
}
