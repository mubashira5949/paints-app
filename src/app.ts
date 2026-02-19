
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
fastify.get('/health', async (request, reply) => {
    return { status: 'ok' }
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
