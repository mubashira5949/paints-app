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
            rejectUnauthorized: false // Neon requires SSL for secure connections
        }
    })

    // Verify the database connection on startup.
    try {
        await pool.query('SELECT 1')
        fastify.log.info('Database connected successfully')
    } catch (err) {
        // Fail the startup if the database connection cannot be established.
        fastify.log.error({ err }, 'Database connection failed')
        throw err
    }

    /**
     * Decorate the Fastify instance with the pool object.
     * This allows accessed via 'fastify.db' throughout the application.
     */
    fastify.decorate('db', pool)

    // Ensure the connection pool is closed when the Fastify instance is closed.
    fastify.addHook('onClose', async (instance) => {
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
