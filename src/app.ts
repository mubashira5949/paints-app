/**
 * Main application entry point for the Paints App API.
 * Configures Fastify, registers plugins, modules, and defines basic routes.
 */

import Fastify from 'fastify'
import dbConnector from './plugins/db'
import jwtConnector from './plugins/jwt'
import dotenv from 'dotenv'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import swagger from '@fastify/swagger'
import swaggerUI from '@fastify/swagger-ui'
import cors from '@fastify/cors'

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
}).withTypeProvider<TypeBoxTypeProvider>()

// Allow Cross-Origin requests from the frontend
fastify.register(cors, {
    origin: true // Allow all origins for development, can be configured securely later
})

// Global Error Handler to catch and format TypeBox Validation Failures
fastify.setErrorHandler((error: any, request, reply) => {
    if (error.validation) {
        reply.status(400).send({
            error: 'Bad Request',
            message: 'Validation failed',
            details: error.validation
        })
    } else {
        fastify.log.error(error)
        const statusCode = error.statusCode || 500
        const errorName = statusCode === 500 ? 'Internal Server Error' : (error.name || 'Error')
        reply.status(statusCode).send({ error: errorName, message: error.message || 'An unexpected error occurred' })
    }
})

// Register Swagger API documentation
fastify.register(swagger, {
    openapi: {
        info: {
            title: 'Paints App API',
            description: 'API documentation for Paints App',
            version: '1.0.0'
        },
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT'
                }
            }
        },
        security: [{ bearerAuth: [] }]
    }
})

fastify.register(swaggerUI, {
    routePrefix: '/docs',
    uiConfig: {
        docExpansion: 'list',
        deepLinking: false
    }
})

// Register core plugins: Database connection and JWT Authentication
fastify.register(dbConnector)
fastify.register(jwtConnector)

// Register feature modules
import userModule from './modules/users'
import authModule from './modules/auth'
import resourcesModule from './modules/resources'
import colorsModule from './modules/colors'
import recipesModule from './modules/recipes'
import productionModule from './modules/production'

/**
 * Register user management module.
 */
fastify.register(userModule)

/**
 * Register authentication module with a '/auth' prefix.
 */
fastify.register(authModule, { prefix: '/auth' })

/**
 * Register resources module with a '/resources' prefix.
 */
fastify.register(resourcesModule, { prefix: '/resources' })

/**
 * Register colors module with a '/colors' prefix.
 */
fastify.register(colorsModule, { prefix: '/colors' })

/**
 * Register recipes module with a '/recipes' prefix.
 */
fastify.register(recipesModule, { prefix: '/recipes' })

/**
 * Register production runs module with a '/production-runs' prefix.
 */
fastify.register(productionModule, { prefix: '/production-runs' })

import inventoryModule from './modules/inventory'

/**
 * Register inventory module with a '/inventory' prefix.
 */
fastify.register(inventoryModule, { prefix: '/inventory' })

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
