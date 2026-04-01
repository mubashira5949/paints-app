/**
 * Resources Module
 * Handles operations related to raw materials / resources.
 */

import { FastifyInstance } from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'
import { authorizeRole } from '../../utils/authorizeRole'

export default async function (fastifyRaw: FastifyInstance) {
    const fastify = fastifyRaw.withTypeProvider<TypeBoxTypeProvider>()

    const CreateResourceSchema = Type.Object({
        name: Type.String(),
        description: Type.Optional(Type.String()),
        unit: Type.String({ description: 'Unit of measurement, e.g., kg, L, g' }) // e.g., kg, L, etc.
    })

    const UpdateResourceSchema = Type.Object({
        name: Type.Optional(Type.String()),
        description: Type.Optional(Type.String()),
        unit: Type.Optional(Type.String())
    })

    const ResourceIdParamSchema = Type.Object({
        id: Type.Integer()
    })

    /**
     * GET /resources - Retrieve all resources
     * Accessible to all authenticated users.
     */
    fastify.get('/', {
        preHandler: [fastify.authenticate],
        handler: async (request, reply) => {
            try {
                const result = await fastify.db.query(
                    'SELECT id, name, description, unit, current_stock, created_at, updated_at FROM resources ORDER BY name ASC'
                )
                return reply.send(result.rows)
            } catch (err) {
                fastify.log.error(err)
                return reply.status(500).send({
                    error: 'Internal Server Error',
                    message: 'Failed to retrieve resources'
                })
            }
        }
    })

    /**
     * GET /resources/:id - Retrieve a specific resource by ID
     */
    fastify.get('/:id', {
        preHandler: [fastify.authenticate],
        schema: {
            params: ResourceIdParamSchema
        },
        handler: async (request, reply) => {
            const { id } = request.params
            try {
                const result = await fastify.db.query(
                    'SELECT id, name, description, unit, current_stock, created_at, updated_at FROM resources WHERE id = $1',
                    [id]
                )
                if (result.rows.length === 0) {
                    return reply.status(404).send({
                        error: 'Not Found',
                        message: 'Resource not found'
                    })
                }
                return reply.send(result.rows[0])
            } catch (err) {
                fastify.log.error(err)
                return reply.status(500).send({
                    error: 'Internal Server Error',
                    message: 'Failed to retrieve resource'
                })
            }
        }
    })

    /**
     * POST /resources - Create a new resource
     * Only accessible by 'admin' or 'manager'
     */
    fastify.post('/', {
        preHandler: [fastify.authenticate, authorizeRole(['admin', 'manager'])],
        schema: {
            body: CreateResourceSchema
        },
        handler: async (request, reply) => {
            const { name, description, unit } = request.body
            try {
                const insertResult = await fastify.db.query(
                    'INSERT INTO resources (name, description, unit) VALUES ($1, $2, $3) RETURNING *',
                    [name, description, unit]
                )
                const newResource = insertResult.rows[0]

                // Log audit action
                const user = request.user as any
                await fastify.db.query(
                    `INSERT INTO audit_logs (user_id, action, entity_type, entity_id)
                     VALUES ($1, 'resource_created', 'resource', $2)`,
                    [user.id, newResource.id]
                )

                return reply.status(201).send({
                    message: 'Resource created successfully',
                    resource: newResource
                })
            } catch (err: any) {
                if (err.code === '23505') { // Unique constraint violation
                    return reply.status(400).send({
                        error: 'Bad Request',
                        message: 'A resource with this name already exists'
                    })
                }
                fastify.log.error(err)
                return reply.status(500).send({
                    error: 'Internal Server Error',
                    message: 'Failed to create resource'
                })
            }
        }
    })

    /**
     * PUT /resources/:id - Update an existing resource
     * Only accessible by 'admin' or 'manager'
     */
    fastify.put('/:id', {
        preHandler: [fastify.authenticate, authorizeRole(['admin', 'manager'])],
        schema: {
            params: ResourceIdParamSchema,
            body: UpdateResourceSchema
        },
        handler: async (request, reply) => {
            const { id } = request.params
            const { name, description, unit } = request.body

            try {
                // Build dynamic update query
                const updates: string[] = []
                const values: any[] = []
                let paramIdx = 1

                if (name !== undefined) {
                    updates.push(`name = $${paramIdx++}`)
                    values.push(name)
                }
                if (description !== undefined) {
                    updates.push(`description = $${paramIdx++}`)
                    values.push(description)
                }
                if (unit !== undefined) {
                    updates.push(`unit = $${paramIdx++}`)
                    values.push(unit)
                }

                // If nothing to update, return the existing resource
                if (updates.length === 0) {
                    const existing = await fastify.db.query('SELECT * FROM resources WHERE id = $1', [id])
                    if (existing.rows.length === 0) {
                        return reply.status(404).send({ error: 'Not Found', message: 'Resource not found' })
                    }
                    return reply.send(existing.rows[0])
                }

                updates.push(`updated_at = CURRENT_TIMESTAMP`)
                values.push(id) // Add ID for the WHERE clause

                const updateQuery = `UPDATE resources SET ${updates.join(', ')} WHERE id = $${paramIdx} RETURNING *`

                const updateResult = await fastify.db.query(updateQuery, values)

                if (updateResult.rows.length === 0) {
                    return reply.status(404).send({
                        error: 'Not Found',
                        message: 'Resource not found'
                    })
                }

                // Log audit action
                const user = request.user as any
                await fastify.db.query(
                    `INSERT INTO audit_logs (user_id, action, entity_type, entity_id)
                     VALUES ($1, 'resource_updated', 'resource', $2)`,
                    [user.id, id]
                )

                return reply.send({
                    message: 'Resource updated successfully',
                    resource: updateResult.rows[0]
                })

            } catch (err: any) {
                if (err.code === '23505') { // Unique constraint violation
                    return reply.status(400).send({
                        error: 'Bad Request',
                        message: 'A resource with this name already exists'
                    })
                }
                fastify.log.error(err)
                return reply.status(500).send({
                    error: 'Internal Server Error',
                    message: 'Failed to update resource'
                })
            }
        }
    })

    /**
     * DELETE /resources/:id - Delete a resource
     * Only accessible by 'admin' or 'manager'
     */
    fastify.delete('/:id', {
        preHandler: [fastify.authenticate, authorizeRole(['admin', 'manager'])],
        schema: {
            params: ResourceIdParamSchema
        },
        handler: async (request, reply) => {
            const { id } = request.params
            try {
                // Delete the resource
                const deleteResult = await fastify.db.query(
                    'DELETE FROM resources WHERE id = $1 RETURNING id',
                    [id]
                )

                if (deleteResult.rows.length === 0) {
                    return reply.status(404).send({
                        error: 'Not Found',
                        message: 'Resource not found'
                    })
                }

                // Log audit action
                const user = request.user as any
                await fastify.db.query(
                    `INSERT INTO audit_logs (user_id, action, entity_type, entity_id)
                      VALUES ($1, 'resource_deleted', 'resource', $2)`,
                    [user.id, id]
                )

                return reply.send({
                    message: 'Resource deleted successfully'
                })
            } catch (err: any) {
                // Check for foreign key constraint violation (e.g., resource used in formula)
                if (err.code === '23503') {
                    return reply.status(400).send({
                        error: 'Bad Request',
                        message: 'Cannot delete resource: it is currently used in formulas or transactions.'
                    })
                }
                fastify.log.error(err)
                return reply.status(500).send({
                    error: 'Internal Server Error',
                    message: 'Failed to delete resource'
                })
            }
        }
    })
}
