/**
 * User Module
 * Handles user management operations like registration and deletion.
 */

import { FastifyInstance } from 'fastify'
import bcrypt from 'bcrypt'

export default async function (fastify: FastifyInstance) {
    /**
     * POST /users - Create a new user.
     * Only accessible by users with 'manager' role.
     */
    fastify.post('/users', {
        // middleware to verify JWT
        preHandler: [fastify.authenticate],
        // request body validation schema
        schema: {
            body: {
                type: 'object',
                required: ['username', 'password', 'role'],
                properties: {
                    username: { type: 'string' },
                    password: { type: 'string', minLength: 6 },
                    role: { type: 'string' }
                }
            }
        },
        handler: async (request: any, reply: any) => {
            const { username, password, role } = request.body
            const currentUser = request.user

            // Role-based access control: Only 'manager' can create other users.
            if (currentUser.role !== 'manager') {
                return reply.status(403).send({
                    error: 'Forbidden',
                    message: 'Only Managers can create users'
                })
            }

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
                    'INSERT INTO users (username, password_hash, role_id) VALUES ($1, $2, $3) RETURNING id, username, role_id, created_at',
                    [username, passwordHash, roleId]
                )

                const newUser = userResult.rows[0]

                // Return the newly created user (excluding sensitive data like password hash).
                return reply.status(201).send({
                    message: 'User created successfully',
                    user: {
                        id: newUser.id,
                        username: newUser.username,
                        role: role,
                        created_at: newUser.created_at
                    }
                })
            } catch (err: any) {
                // Handle duplicate username error (PostgreSQL unique constraint violation).
                if (err.code === '23505') {
                    return reply.status(400).send({
                        error: 'Bad Request',
                        message: 'Username already exists'
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
     * DELETE /users/:id - Delete a user by their ID.
     * Only accessible by users with 'manager' role.
     */
    fastify.delete('/users/:id', {
        // middleware to verify JWT
        preHandler: [fastify.authenticate],
        // parameter validation schema
        schema: {
            params: {
                type: 'object',
                required: ['id'],
                properties: {
                    id: { type: 'integer' }
                }
            }
        },
        handler: async (request: any, reply: any) => {
            const { id } = request.params
            const currentUser = request.user

            // Role-based access control: Only 'manager' can delete users.
            if (currentUser.role !== 'manager') {
                return reply.status(403).send({
                    error: 'Forbidden',
                    message: 'Only Managers can delete users'
                })
            }

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
