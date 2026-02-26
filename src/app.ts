/**
 * Main application entry point for the Paints App API.
 * Configures Fastify, registers plugins, modules, and defines basic routes.
 */

import Fastify from 'fastify'
import dbConnector from './plugins/db'
import jwtConnector from './plugins/jwt'
import dotenv from 'dotenv'

// Load environment variables from .env file
dotenv.config()

/**
 * Initialize Fastify server with logging enabled.
 */
const fastify = Fastify({
    logger: {
        transport: {
            target: 'pino-pretty'
        }
    }
})

// Register core plugins: Database connection and JWT Authentication
fastify.register(dbConnector)
fastify.register(jwtConnector)

// Register feature modules
import userModule from './modules/users'
import authModule from './modules/auth'

/**
 * Register user management module.
 */
fastify.register(userModule)

/**
 * Register authentication module with a '/auth' prefix.
 */
fastify.register(authModule, { prefix: '/auth' })

/**
 * Root endpoint - returns basic API information.
 */
fastify.get('/', async (request, reply) => {
    return {
        name: 'Paints App API',
        version: '1.0.0',
        message: 'Welcome to the Paints App API',
        endpoints: {
            health: '/health'
        }
    }
})

/**
 * Health check endpoint - verifies API and database connection.
 */
fastify.get('/health', async (request, reply) => {
    try {
        // Verify database connection by running a simple query
        await fastify.db.query('SELECT 1')
        return {
            status: 'ok',
            database: 'healthy'
        }
    } catch (err) {
        // Log error and return unhealthy status if DB connection fails
        fastify.log.error(err)
        return reply.status(500).send({
            status: 'unhealthy',
            database: 'unhealthy',
            error: err instanceof Error ? err.message : 'Unknown error'
        })
    }
})

/**
 * Function to start the Fastify server.
 */
const start = async () => {
    try {
        const port = parseInt(process.env.PORT || '3000')
        // Listen on the specified port and host
        await fastify.listen({ port, host: '0.0.0.0' })
    } catch (err) {
        // Log entry point errors and exit the process
        fastify.log.error(err)
        process.exit(1)
    }
}

// Execute the start function
start()
