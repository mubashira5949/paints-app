/**
 * Colors Module
 * Handles operations related to paint colors.
 */

import { FastifyInstance } from 'fastify'
import { authorizeRole } from '../../utils/authorizeRole'

export default async function (fastify: FastifyInstance) {
    /**
     * GET /colors - Retrieve all colors.
     * Accessible to all authenticated users.
     */
    fastify.get('/', {
        // middleware to verify JWT
        preHandler: [fastify.authenticate],
        handler: async (request: any, reply: any) => {
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
        // middleware to verify JWT and check user role
        preHandler: [fastify.authenticate, authorizeRole(['admin', 'manager'])],
        // request body validation schema
        schema: {
            body: {
                type: 'object',
                required: ['name'],
                properties: {
                    name: { type: 'string' },
                    color_code: { type: 'string' },
                    description: { type: 'string' }
                }
            }
        },
        handler: async (request: any, reply: any) => {
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
                await client.query(
                    `INSERT INTO audit_logs (user_id, action, entity_type, entity_id)
                     VALUES ($1, 'color_created', 'color', $2)`,
                    [request.user.id, newColor.id]
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
}
