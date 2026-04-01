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
import formulasModule from './modules/formulas'
import productionModule from './modules/production'
import dashboardModule from './modules/dashboard'

/**
 * Register dashboard module with a '/api' prefix (since user asked for /api/dashboard).
 * Actually, usually we prefix feature modules. Let's see how others are done.
 * The user asked for GET /api/dashboard.
 */
fastify.register(dashboardModule, { prefix: '/api' })

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
 * Register formulas module with a '/formulas' prefix.
 */
fastify.register(formulasModule, { prefix: '/formulas' })

/**
 * Register production runs module with a '/production-runs' prefix.
 */
fastify.register(productionModule, { prefix: '/production-runs' })

import inventoryModule from './modules/inventory'

/**
 * Register inventory module with a '/inventory' prefix.
 */
fastify.register(inventoryModule, { prefix: '/inventory' })

import inventoryApi from './modules/inventory/inventory.api'

/**
 * Register core inventory API with '/api/inventory' prefix.
 */
fastify.register(inventoryApi, { prefix: '/api/inventory' })

import salesModule from './modules/sales'

/**
 * Register sales module with a '/sales' prefix.
 */
fastify.register(salesModule, { prefix: '/sales' })

import clientsModule from './modules/clients'

/**
 * Register clients module with a '/clients' prefix.
 */
fastify.register(clientsModule, { prefix: '/clients' })

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

        // Apply incremental schema migrations on startup
        await fastify.ready()
        await fastify.db.query(`
            -- 1. Clients entity (onboarding)
            CREATE TABLE IF NOT EXISTS clients (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                gst_number VARCHAR(20) UNIQUE,
                contact_name VARCHAR(255),
                contact_phone VARCHAR(30),
                contact_email VARCHAR(255),
                billing_address TEXT,
                created_by INTEGER REFERENCES users(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            -- 2. Client Shipping Addresses (Many per client)
            CREATE TABLE IF NOT EXISTS client_shipping_addresses (
                id SERIAL PRIMARY KEY,
                client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
                label VARCHAR(100) NOT NULL,
                address TEXT NOT NULL,
                is_default BOOLEAN DEFAULT FALSE
            );

            -- 3. Core orders table (if not exists)
            CREATE TABLE IF NOT EXISTS client_orders (
                id SERIAL PRIMARY KEY,
                client_name VARCHAR(255) NOT NULL,
                status VARCHAR(50) DEFAULT 'pending',
                notes TEXT,
                created_by INTEGER REFERENCES users(id) NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            -- 4. Order Items
            CREATE TABLE IF NOT EXISTS client_order_items (
                id SERIAL PRIMARY KEY,
                order_id INTEGER REFERENCES client_orders(id) ON DELETE CASCADE,
                color_id INTEGER REFERENCES colors(id) NOT NULL,
                pack_size_kg DECIMAL(5, 2) NOT NULL,
                quantity INTEGER NOT NULL
            );

            -- 5. Linking existing orders to clients (if not already linked)
            ALTER TABLE client_orders ADD COLUMN IF NOT EXISTS client_id INTEGER REFERENCES clients(id);
            ALTER TABLE client_orders ADD COLUMN IF NOT EXISTS shipping_address_id INTEGER REFERENCES client_shipping_addresses(id);

            -- 6. Add created_by to transactional tables if they don't exist
            ALTER TABLE finished_stock_transactions ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id);

            -- 7. Track who last updated a client
            ALTER TABLE clients ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES users(id);
        `)

        await fastify.listen({ port, host: '0.0.0.0' })
    } catch (err) {
        // Log entry point errors and exit the process
        fastify.log.error(err)
        process.exit(1)
    }
}

// Execute the start function
start()
