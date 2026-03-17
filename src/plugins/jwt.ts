/**
 * JWT Authentication Plugin
 * Configures JSON Web Token support using ES256 (ECDSA P-256) asymmetric keypair.
 *
 * - Tokens are SIGNED with the private key (server only).
 * - Tokens are VERIFIED with the public key (shareable with anyone).
 * - The public key is exposed at GET /auth/public-key for external verification.
 */

import fp from 'fastify-plugin'
import fastifyJwt from '@fastify/jwt'
import { FastifyInstance } from 'fastify'

async function jwtConnector(fastify: FastifyInstance) {
    const rawPrivate = process.env.ES_PRIVATE_KEY
    const rawPublic  = process.env.ES_PUBLIC_KEY

    if (!rawPrivate || !rawPublic) {
        throw new Error('ES_PRIVATE_KEY and ES_PUBLIC_KEY environment variables must be set')
    }

    // Support both JSON-escaped (\n) and literal newlines in the PEM strings
    const privateKey = rawPrivate.replace(/\\n/g, '\n')
    const publicKey  = rawPublic.replace(/\\n/g, '\n')

    /**
     * Register @fastify/jwt with ES256 asymmetric keypair.
     * sign   → uses privateKey
     * verify → uses publicKey
     */
    fastify.register(fastifyJwt, {
        secret: {
            private: privateKey,
            public:  publicKey,
        },
        sign: {
            algorithm: 'ES256',
            expiresIn: '24h',
        },
        verify: {
            algorithms: ['ES256'],
        },
    })

    /**
     * Decorate fastify with 'authenticate' — used as a preHandler on protected routes.
     */
    fastify.decorate('authenticate', async function (request: any, reply: any) {
        try {
            await request.jwtVerify()
        } catch (err) {
            reply.send(err)
        }
    })
}

export default fp(jwtConnector)

/**
 * TypeScript Declaration Merging
 */
declare module 'fastify' {
    interface FastifyInstance {
        authenticate: (request: any, reply: any) => Promise<void>
    }
}
