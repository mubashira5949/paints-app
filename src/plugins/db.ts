/**
 * Database Plugin
 * Configures the PostgreSQL database connection using 'pg' Pool.
 */

import fp from 'fastify-plugin'
import { Pool } from 'pg'
import { FastifyInstance } from 'fastify'

async function dbConnector(fastify: FastifyInstance) {
    /**
     * Create a new PostgreSQL connection pool.
     * Configuration is pulled from the DATABASE_URL environment variable.
     */
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    })

    // Verify the database connection on startup in the background (non-blocking).
    pool.query('SELECT 1').then(() => {
        fastify.log.info('Database connected successfully')
    }).catch(err => {
        // Log error but don't fail the startup if the database connection cannot be established yet.
        // The first database query will naturally retry/wait for the pool or fail then.
        fastify.log.error({ err }, 'Database connection background check failed')
    })

    /**
     * Decorate the Fastify instance with the pool object.
     * This allows accessed via 'fastify.db' throughout the application.
     */
    fastify.decorate('db', pool)

    /**
     * Keep-alive ping every 4 minutes to prevent Neon serverless DB from
     * suspending its compute after 5 minutes of inactivity.
     * Without this, the first query after idle takes 2-3 seconds (cold start).
     */
    const keepAlive = setInterval(async () => {
        try {
            await pool.query('SELECT 1')
        } catch (err) {
            fastify.log.warn({ err }, 'DB keep-alive ping failed')
        }
    }, 4 * 60 * 1000) // 4 minutes

    // Ensure the connection pool and keep-alive are cleaned up on server close.
    fastify.addHook('onClose', async (instance) => {
        clearInterval(keepAlive)
        await pool.end()
    })
}

// Wrap with fastify-plugin to ensure the decorator is available to all scopes.
export default fp(dbConnector)

/**
 * TypeScript Declaration Merging
 * Adds the 'db' property to the FastifyInstance type.
 */
declare module 'fastify' {
    interface FastifyInstance {
        db: Pool
    }
}
