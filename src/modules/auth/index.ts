/**
 * Authentication Module
 * Handles user login and JWT token issuance.
 */

import { FastifyInstance } from 'fastify'
import bcrypt from 'bcrypt'

export default async function (fastify: FastifyInstance) {
    /**
     * POST /login - Authenticate a user and return a JWT token.
     */
    fastify.post('/login', {
        // request body validation schema
        schema: {
            body: {
                type: 'object',
                required: ['username', 'password'],
                properties: {
                    username: { type: 'string' },
                    password: { type: 'string' }
                }
            }
        },
        handler: async (request, reply) => {
            const { username, password } = request.body as any

            try {
                // 1. Retrieve the user and their associated role name from the database.
                // Only active users are allowed to log in.
                const result = await fastify.db.query(
                    `SELECT u.id, u.username, u.password_hash, r.name as role 
                     FROM users u 
                     JOIN roles r ON u.role_id = r.id 
                     WHERE u.username = $1 AND u.is_active = TRUE`,
                    [username]
                )

                // If user doesn't exist or is inactive.
                if (result.rows.length === 0) {
                    return reply.status(401).send({
                        error: 'Unauthorized',
                        message: 'Invalid username or password'
                    })
                }

                const user = result.rows[0]

                // 2. Verify the provided password against the stored hash.
                const isMatch = await bcrypt.compare(password, user.password_hash)
                if (!isMatch) {
                    return reply.status(401).send({
                        error: 'Unauthorized',
                        message: 'Invalid username or password'
                    })
                }

                // 3. Generate a JWT token containing user identity and role.
                // This token will be used for subsequent authenticated requests.
                const token = fastify.jwt.sign({
                    id: user.id,
                    username: user.username,
                    role: user.role
                })

                // Return the generated token to the client.
                return { token }
            } catch (err) {
                // Log and return internal error for failures.
                fastify.log.error(err)
                return reply.status(500).send({
                    error: 'Internal Server Error',
                    message: 'Login failed'
                })
            }
        }
    })
}
