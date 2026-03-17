/**
 * Authentication Module
 * Handles user login with JWT issuance (ES256 asymmetric).
 *
 * POST /login    — accepts email OR username as `identifier`
 * GET  /public-key — returns the ES256 public key for external token verification
 */

import { FastifyInstance } from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'
import bcrypt from 'bcrypt'

export default async function (fastifyRaw: FastifyInstance) {
    const fastify = fastifyRaw.withTypeProvider<TypeBoxTypeProvider>()

    const LoginSchema = Type.Object({
        identifier: Type.String({
            description: 'Email address or username',
            minLength: 1,
        }),
        password: Type.String({ minLength: 1 }),
    })

    /**
     * POST /login
     * Accepts { identifier, password } where `identifier` is either an email or a username.
     * Returns a signed ES256 JWT valid for 24 hours.
     */
    fastify.post('/login', {
        schema: {
            body: LoginSchema,
        },
        handler: async (request, reply) => {
            const { identifier, password } = request.body

            try {
                // Match on either email OR username — active users only.
                const result = await fastify.db.query(
                    `SELECT u.id, u.username, u.email, u.password_hash, r.name AS role
                     FROM users u
                     JOIN roles r ON u.role_id = r.id
                     WHERE (u.email = $1 OR u.username = $1)
                       AND u.is_active = TRUE
                     LIMIT 1`,
                    [identifier]
                )

                if (result.rows.length === 0) {
                    return reply.status(401).send({
                        error: 'Unauthorized',
                        message: 'Invalid credentials',
                    })
                }

                const user = result.rows[0]

                // Verify password against the stored bcrypt hash.
                const isMatch = await bcrypt.compare(password, user.password_hash)
                if (!isMatch) {
                    return reply.status(401).send({
                        error: 'Unauthorized',
                        message: 'Invalid credentials',
                    })
                }

                // Update last_login timestamp.
                await fastify.db.query(
                    'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
                    [user.id]
                )

                /**
                 * Sign a JWT using the ES256 private key.
                 * Expiry (24h) and iat/exp claims are added automatically by @fastify/jwt
                 * based on the `sign.expiresIn` option set in the jwt plugin.
                 */
                const token = fastify.jwt.sign({
                    id:       user.id,
                    username: user.username,
                    email:    user.email,
                    role:     user.role,
                })

                return { token }
            } catch (err) {
                fastify.log.error(err)
                return reply.status(500).send({
                    error: 'Internal Server Error',
                    message: 'Login failed',
                })
            }
        },
    })

    /**
     * GET /public-key
     * Returns the ES256 public key in PEM format.
     * Anyone can use this key to independently verify tokens issued by this server
     * without needing access to the private key or the server itself.
     *
     * Example verification: paste the token + this key at https://jwt.io
     */
    fastify.get('/public-key', {
        handler: async (_request, reply) => {
            const rawPublic = process.env.ES_PUBLIC_KEY
            if (!rawPublic) {
                return reply.status(500).send({ error: 'Public key not configured' })
            }
            const publicKey = rawPublic.replace(/\\n/g, '\n')
            return reply.send({
                algorithm: 'ES256',
                publicKey,
            })
        },
    })
}
