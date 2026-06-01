/**
 * JWT Authentication Plugin
 * Configures JSON Web Token support using ES256 (ECDSA P-256) asymmetric keypair.
 *
 * - Tokens are SIGNED with the private key (server only).
 * - Tokens are VERIFIED with the public key (shareable with anyone).
 * - The public key is exposed at GET /auth/public-key for external verification.
 * 
 * Keys are loaded from environment variables.
 * If not provided, a fresh keypair is generated at startup automatically.
 *
 * - ES_PRIVATE_KEY: PEM private key — signs tokens (server only)
 * - ES_PUBLIC_KEY:  PEM public key  — verifies tokens (shareable)
 */

import fp from 'fastify-plugin'
import fastifyJwt from '@fastify/jwt'
import { FastifyInstance } from 'fastify'
import { generateKeyPairSync } from 'crypto'

/**
 * Parse an environment variable PEM string securely.
 * Supports both raw PEM strings (with or without escaped newlines) and base64-encoded strings.
 */
function parsePem(raw: string, label: string): string {
    let pem = raw.trim()
    
    // If it doesn't look like a raw PEM, assume it's base64 encoded
    if (!pem.startsWith('-----BEGIN') && !pem.includes('\\n-----BEGIN')) {
        pem = Buffer.from(pem, 'base64').toString('utf-8')
    }
    
    // Replace escaped newlines for JSON configurations
    pem = pem.replace(/\\n/g, '\n')
    
    if (!pem.startsWith('-----BEGIN')) {
        throw new Error(`${label} does not look like a valid PEM string. Ensure it is either base64 encoded or a raw string starting with -----BEGIN ...`)
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
        privateKey = parsePem(rawPrivate, 'ES_PRIVATE_KEY')
        publicKey  = parsePem(rawPublic,  'ES_PUBLIC_KEY')
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

/**
 * TypeScript Declaration Merging
 */
declare module 'fastify' {
    interface FastifyInstance {
        authenticate: (request: any, reply: any) => Promise<void>
    }
}
