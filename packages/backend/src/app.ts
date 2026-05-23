/**
 * Main application entry point for the Paints App API.
 * Configures Fastify, registers plugins, modules, and defines basic routes.
 */

import Fastify from 'fastify'
import dbConnector from './plugins/db'
import jwtConnector from './plugins/jwt'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import cors from '@fastify/cors';
import scalarApiReference from '@scalar/fastify-api-reference'

// Load environment variables from .env file
dotenv.config()

/**
 * Initialize Fastify server with logging enabled.
 */
const fastify = Fastify({
    trustProxy: true,
    logger: {
        transport: {
            target: 'pino-pretty'
        }
    }
}).withTypeProvider<TypeBoxTypeProvider>()

// Allow Cross-Origin requests from the frontend
fastify.register(cors, {
    origin: true, // Allow all origins for development
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
})

// Many POST endpoints (e.g. /production/runs/:id/start, /archive, /restore)
// don't take a body. Default fastify JSON parsing rejects an empty body when
// content-type is application/json; relax that so callers can omit the body.
fastify.addContentTypeParser('application/json', { parseAs: 'string' }, (_req, body, done) => {
    const raw = body as string
    if (!raw) return done(null, undefined)
    try { done(null, JSON.parse(raw)) }
    catch (err) { done(err as Error) }
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

// API docs: serve the hand-authored openapi.yaml and render it with Scalar.
// The yaml is the single source of truth — also fed to `openapi-typescript`
// to generate request/response types (src/types/openapi.gen.ts).
const OPENAPI_YAML_PATH = path.resolve(__dirname, '..', 'openapi.yaml')
const OPENAPI_YAML = fs.readFileSync(OPENAPI_YAML_PATH, 'utf-8')

fastify.get('/openapi.yaml', async (_request, reply) => {
    reply.type('application/yaml').send(OPENAPI_YAML)
})

fastify.register(scalarApiReference, {
    routePrefix: '/docs',
    configuration: {
        url: '/openapi.yaml',
        theme: 'default',
    },
})

// Register core plugins: Database connection and JWT Authentication
fastify.register(dbConnector)
fastify.register(jwtConnector)

// Register feature modules
import userModule from './modules/users'
import authModule from './modules/auth'
import resourcesModule from './modules/resources'
import paintsModule from './modules/paints'
import formulasModule from './modules/formulas'
import productionModule from './modules/production'
import dashboardModule from './modules/dashboard'
import inventoryModule from './modules/inventory'
import salesModule from './modules/sales'
import customersModule from './modules/customers'
import settingsModule from './modules/settings'
import suppliersModule from './modules/suppliers'
import purchaseOrdersModule from './modules/purchase-orders'
import lossesModule from './modules/losses'
import { IPgClientLike } from './types/misc'

fastify.register(authModule, { prefix: '/auth' })
fastify.register(userModule)
fastify.register(paintsModule, { prefix: '/paints' })
fastify.register(formulasModule, { prefix: '/formulas' })
fastify.register(resourcesModule, { prefix: '/resources' })
fastify.register(customersModule, { prefix: '/customers' })
fastify.register(suppliersModule, { prefix: '/suppliers' })
fastify.register(purchaseOrdersModule, { prefix: '/purchase-orders' })
fastify.register(settingsModule, { prefix: '/settings' })
fastify.register(productionModule, { prefix: '/production' })
fastify.register(salesModule, { prefix: '/sales' })
fastify.register(inventoryModule, { prefix: '/inventory' })
fastify.register(dashboardModule, { prefix: '/api' })
fastify.register(lossesModule, { prefix: '/api/losses' })

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
        await fastify.db.query('SELECT 1', [])
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

        // Schema is owned by src/scripts/seed-production.ts (run via `make db-init`).
        // The app no longer mutates the database on startup.
        await fastify.ready()

        await fastify.listen({ port, host: '0.0.0.0' })
    } catch (err) {
        // Log entry point errors and exit the process
        fastify.log.error(err)
        process.exit(1)
    }
}

// Execute the start function
start()
