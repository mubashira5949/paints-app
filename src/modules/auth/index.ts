/**
 * Authentication Module
 * Handles user login and JWT token issuance.
 */

import { FastifyInstance } from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'
import bcrypt from 'bcrypt'

export default async function (fastifyRaw: FastifyInstance) {
    const fastify = fastifyRaw.withTypeProvider<TypeBoxTypeProvider>()

    const LoginSchema = Type.Object({
        email: Type.String({ format: 'email' }),
        password: Type.String()
    })

    /**
     * POST /login - Authenticate a user and return a JWT token.
     */
    fastify.post('/login', {
        schema: {
            body: LoginSchema
        },
        handler: async (request, reply) => {
            const { email, password } = request.body

            try {
                // 1. Retrieve the user and their associated role name from the database.
                // Only active users are allowed to log in.
                const result = await fastify.db.query(
                    `SELECT u.id, u.username, u.email, u.password_hash, r.name as role 
                     FROM users u 
                     JOIN roles r ON u.role_id = r.id 
                     WHERE u.email = $1 AND u.is_active = TRUE`,
                    [email]
                )

                // If user doesn't exist or is inactive.
                if (result.rows.length === 0) {
                    return reply.status(401).send({
                        error: 'Unauthorized',
                        message: 'Invalid email or password'
                    })
                }

                const user = result.rows[0]

                // 2. Verify the provided password against the stored hash.
                const isMatch = await bcrypt.compare(password, user.password_hash)
                if (!isMatch) {
                    return reply.status(401).send({
                        error: 'Unauthorized',
                        message: 'Invalid email or password'
                    })
                }

                // 3. Generate a JWT token containing user identity and role.
                // This token will be used for subsequent authenticated requests.
                const token = fastify.jwt.sign({
                    id: user.id,
                    username: user.username,
                    email: user.email,
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
