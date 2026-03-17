/**
 * JWT Authentication Plugin
 * Configures JSON Web Token support using ES256 (ECDSA P-256) asymmetric keypair.
 *
 * Keys are loaded from environment variables (base64-encoded PEM strings).
 * If not provided, a fresh keypair is generated at startup automatically.
 *
 * - ES_PRIVATE_KEY: base64(PEM private key) — signs tokens (server only)
 * - ES_PUBLIC_KEY:  base64(PEM public key)  — verifies tokens (shareable)
 */

import fp from 'fastify-plugin'
import fastifyJwt from '@fastify/jwt'
import { FastifyInstance } from 'fastify'
import { generateKeyPairSync } from 'crypto'

/**
 * Decode a base64-encoded PEM string into a proper PEM string.
 */
function decodePem(b64: string, label: string): string {
    const pem = Buffer.from(b64.trim(), 'base64').toString('utf-8')
    if (!pem.startsWith('-----BEGIN')) {
        throw new Error(`${label} does not look like a valid PEM after base64 decoding`)
    }
    return pem
}

/**
 * Generate a fresh ES256 (P-256) keypair using Node's built-in crypto.
 * Used as a fallback when ES_PRIVATE_KEY / ES_PUBLIC_KEY are not set.
 */
function generateEcKeyPair(): { privateKey: string; publicKey: string } {
    const { privateKey, publicKey } = generateKeyPairSync('ec', {
        namedCurve: 'P-256',
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
        publicKeyEncoding: { type: 'spki', format: 'pem' },
    })
    return { privateKey, publicKey }
}

async function jwtConnector(fastify: FastifyInstance) {
    let privateKey: string
    let publicKey: string

    const rawPrivate = process.env.ES_PRIVATE_KEY
    const rawPublic  = process.env.ES_PUBLIC_KEY

    if (rawPrivate && rawPublic) {
        // Use keys from environment variables (production / Railway)
        privateKey = decodePem(rawPrivate, 'ES_PRIVATE_KEY')
        publicKey  = decodePem(rawPublic,  'ES_PUBLIC_KEY')
        fastify.log.info('JWT: loaded EC keypair from environment variables')
    } else {
        // Auto-generate a keypair — tokens will be invalidated on restart
        fastify.log.warn(
            'ES_PRIVATE_KEY / ES_PUBLIC_KEY not set — generating a temporary EC keypair. ' +
            'Tokens will be invalidated on every restart. ' +
            'Set these env vars in Railway for persistent tokens.'
        )
        const generated = generateEcKeyPair()
        privateKey = generated.privateKey
        publicKey  = generated.publicKey
    }

    /**
     * Register @fastify/jwt with ES256 asymmetric keypair.
     * sign   → private key
     * verify → public key
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

declare module 'fastify' {
    interface FastifyInstance {
        authenticate: (request: any, reply: any) => Promise<void>
    }
}
