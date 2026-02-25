
import Fastify from 'fastify'
import dbConnector from './plugins/db'
import jwtConnector from './plugins/jwt'
import dotenv from 'dotenv'

dotenv.config()

const fastify = Fastify({
    logger: {
        transport: {
            target: 'pino-pretty'
        }
    }
})

// Register plugins
fastify.register(dbConnector)
fastify.register(jwtConnector)

// Register modules
import userModule from './modules/users'
import authModule from './modules/auth'
fastify.register(userModule)
fastify.register(authModule, { prefix: '/auth' })

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

fastify.get('/health', async (request, reply) => {
    try {
        // Verify database connection
        await fastify.db.query('SELECT 1')
        return {
            status: 'ok',
            database: 'healthy'
        }
    } catch (err) {
        fastify.log.error(err)
        return reply.status(500).send({
            status: 'unhealthy',
            database: 'unhealthy',
            error: err instanceof Error ? err.message : 'Unknown error'
        })
    }
})
// (You will add modules here)

const start = async () => {
    try {
        const port = parseInt(process.env.PORT || '3000')
        await fastify.listen({ port, host: '0.0.0.0' })
    } catch (err) {
        fastify.log.error(err)
        process.exit(1)
    }
}
start()
