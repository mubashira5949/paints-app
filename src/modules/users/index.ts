/**
 * User Module
 * Handles user management operations like registration and deletion.
 */

import { FastifyInstance } from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'
import bcrypt from 'bcrypt'
import { authorizeRole } from '../../utils/authorizeRole'

export default async function (fastifyRaw: FastifyInstance) {
    const fastify = fastifyRaw.withTypeProvider<TypeBoxTypeProvider>()

    const CreateUserSchema = Type.Object({
        username: Type.String(),
        email: Type.String({ format: 'email' }),
        password: Type.String({ minLength: 6 }),
        role: Type.String()
    })

    const UserIdSchema = Type.Object({
        id: Type.Integer()
    })

    const UpdateUserSchema = Type.Object({
        username: Type.Optional(Type.String()),
        email: Type.Optional(Type.String({ format: 'email' })),
        role: Type.Optional(Type.String()),
        password: Type.Optional(Type.String({ minLength: 6 })),
        is_active: Type.Optional(Type.Boolean())
    })

    /**
     * POST /users - Create a new user.
     * Only accessible by users with 'manager' role.
     */
    fastify.post('/users', {
        preHandler: [fastify.authenticate, authorizeRole(['manager'])],
        schema: {
            body: CreateUserSchema
        },
        handler: async (request, reply) => {
            const { username, email, password, role } = request.body
            const currentUser = request.user

            try {
                // 1. Check if the specified role exists in the database and retrieve its ID.
                const roleResult = await fastify.db.query(
                    'SELECT id FROM roles WHERE name = $1',
                    [role]
                )

                if (roleResult.rows.length === 0) {
                    return reply.status(400).send({
                        error: 'Bad Request',
                        message: `Role '${role}' does not exist`
                    })
                }

                const roleId = roleResult.rows[0].id

                // 2. Hash the user's password securely using bcrypt.
                const saltRounds = 10
                const passwordHash = await bcrypt.hash(password, saltRounds)

                // 3. Insert the new user into the database.
                const userResult = await fastify.db.query(
                    'INSERT INTO users (username, email, password_hash, role_id) VALUES ($1, $2, $3, $4) RETURNING id, username, email, role_id, created_at',
                    [username, email, passwordHash, roleId]
                )

                const newUser = userResult.rows[0]

                // Return the newly created user (excluding sensitive data like password hash).
                return reply.status(201).send({
                    message: 'User created successfully',
                    user: {
                        id: newUser.id,
                        username: newUser.username,
                        email: newUser.email,
                        role: role,
                        created_at: newUser.created_at
                    }
                })
            } catch (err: any) {
                // Handle duplicate username or email error (PostgreSQL unique constraint violation).
                if (err.code === '23505') {
                    return reply.status(400).send({
                        error: 'Bad Request',
                        message: 'Username or Email already exists'
                    })
                }
                // Log and return internal error for other failures.
                fastify.log.error(err)
                return reply.status(500).send({
                    error: 'Internal Server Error',
                    message: 'Failed to create user'
                })
            }
        }
    })

    /**
     * GET /users - Get all users.
     */
    fastify.get('/users', {
        preHandler: [fastify.authenticate, authorizeRole(['manager', 'admin'])],
        handler: async (request, reply) => {
            try {
                const result = await fastify.db.query(`
                    SELECT u.id, u.username, u.email, u.is_active, u.last_login, u.created_at, r.name as role
                    FROM users u
                    JOIN roles r ON u.role_id = r.id
                    ORDER BY u.id ASC
                `)
                return result.rows
            } catch (err) {
                fastify.log.error(err)
                return reply.status(500).send({
                    error: 'Internal Server Error',
                    message: 'Failed to fetch users'
                })
            }
        }
    })

    /**
     * GET /users/summary - Get users summary statistics.
     */
    fastify.get('/users/summary', {
        preHandler: [fastify.authenticate, authorizeRole(['manager', 'admin'])],
        handler: async (request, reply) => {
            try {
                const result = await fastify.db.query(`
                    SELECT 
                        count(*) as total_users,
                        count(*) filter (where r.name = 'manager') as managers,
                        count(*) filter (where r.name = 'operator') as operators,
                        count(*) filter (where r.name = 'sales') as sales,
                        count(*) filter (where r.name = 'client') as client
                    FROM users u
                    JOIN roles r ON u.role_id = r.id
                `)
                return result.rows[0]
            } catch (err) {
                fastify.log.error(err)
                return reply.status(500).send({
                    error: 'Internal Server Error',
                    message: 'Failed to fetch users summary'
                })
            }
        }
    })

    /**
     * GET /roles - Get all available roles.
     */
    fastify.get('/roles', {
        preHandler: [fastify.authenticate, authorizeRole(['manager', 'admin'])],
        handler: async (request, reply) => {
            try {
                const result = await fastify.db.query('SELECT id, name, description FROM roles')
                return result.rows
            } catch (err) {
                fastify.log.error(err)
                return reply.status(500).send({
                    error: 'Internal Server Error',
                    message: 'Failed to fetch roles'
                })
            }
        }
    })

    /**
     * PATCH /users/:id - Update a user.
     */
    fastify.patch('/users/:id', {
        preHandler: [fastify.authenticate, authorizeRole(['manager', 'admin'])],
        schema: {
            params: UserIdSchema,
            body: UpdateUserSchema
        },
        handler: async (request, reply) => {
            const { id } = request.params
            const updates = request.body

            try {
                const fields = []
                const values = []
                let index = 1

                if (updates.username) {
                    fields.push(`username = $${index++}`)
                    values.push(updates.username)
                }
                if (updates.email) {
                    fields.push(`email = $${index++}`)
                    values.push(updates.email)
                }
                if (updates.is_active !== undefined) {
                    fields.push(`is_active = $${index++}`)
                    values.push(updates.is_active)
                }
                if (updates.role) {
                    const roleResult = await fastify.db.query('SELECT id FROM roles WHERE name = $1', [updates.role])
                    if (roleResult.rows.length > 0) {
                        fields.push(`role_id = $${index++}`)
                        values.push(roleResult.rows[0].id)
                    }
                }
                if (updates.password) {
                    const saltRounds = 10
                    const passwordHash = await bcrypt.hash(updates.password, saltRounds)
                    fields.push(`password_hash = $${index++}`)
                    values.push(passwordHash)
                }

                if (fields.length === 0) {
                    return reply.status(400).send({ message: 'No fields to update' })
                }

                values.push(id)
                const query = `UPDATE users SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${index} RETURNING *`
                const result = await fastify.db.query(query, values)

                if (result.rows.length === 0) {
                    return reply.status(404).send({ message: 'User not found' })
                }

                return {
                    message: 'User updated successfully',
                    user: result.rows[0]
                }
            } catch (err) {
                fastify.log.error(err)
                return reply.status(500).send({
                    error: 'Internal Server Error',
                    message: 'Failed to update user'
                })
            }
        }
    })

    /**
     * DELETE /users/:id - Delete a user by their ID.
     * Only accessible by users with 'manager' role.
     */
    fastify.delete('/users/:id', {
        preHandler: [fastify.authenticate, authorizeRole(['manager', 'admin'])],
        schema: {
            params: UserIdSchema
        },
        handler: async (request, reply) => {
            const { id } = request.params
            const currentUser = request.user

            try {
                // Delete user from the database and return the deleted user's info.
                const result = await fastify.db.query(
                    'DELETE FROM users WHERE id = $1 RETURNING id, username',
                    [id]
                )

                // If no user was found with that ID.
                if (result.rows.length === 0) {
                    return reply.status(404).send({
                        error: 'Not Found',
                        message: 'User not found'
                    })
                }

                return {
                    message: 'User deleted successfully',
                    user: result.rows[0]
                }
            } catch (err) {
                // Log and return internal error for failures.
                fastify.log.error(err)
                return reply.status(500).send({
                    error: 'Internal Server Error',
                    message: 'Failed to delete user'
                })
            }
        }
    })
}
