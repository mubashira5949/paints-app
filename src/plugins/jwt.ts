/**
 * JWT Authentication Plugin
 * Configures JSON Web Token support for the application.
 */

import fp from 'fastify-plugin'
import fastifyJwt from '@fastify/jwt'
import { FastifyInstance } from 'fastify'

async function jwtConnector(fastify: FastifyInstance) {
    /**
     * Register the @fastify/jwt plugin with a secret key.
     * The secret is stored in environment variables for security.
     */
    fastify.register(fastifyJwt, {
        secret: process.env.JWT_SECRET || 'supersecret'
    })

    /**
     * Decorate the Fastify instance with an 'authenticate' method.
     * This method can be used as a preHandler hook to protect routes.
     */
    fastify.decorate("authenticate", async function (request: any, reply: any) {
        try {
            // Verify the JWT token provided in the Authorization header.
            await request.jwtVerify()
        } catch (err) {
            // Return error if verification fails (e.g., missing or invalid token).
            reply.send(err)
        }
    })
}

// Wrap with fastify-plugin to make decorators available globally.
export default fp(jwtConnector)

/**
 * TypeScript Declaration Merging
 * Adds the 'authenticate' method to the FastifyInstance type.
 */
declare module 'fastify' {
    interface FastifyInstance {
        authenticate: (request: any, reply: any) => Promise<void>
    }
}
