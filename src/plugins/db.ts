
import fp from 'fastify-plugin'
import { Pool } from 'pg'
import { FastifyInstance } from 'fastify'

async function dbConnector(fastify: FastifyInstance) {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false // Neon requires SSL
        }
    })

    // Test the connection
    try {
        await pool.query('SELECT 1')
        fastify.log.info('Database connected successfully')
    } catch (err) {
        fastify.log.error({ err }, 'Database connection failed')
        throw err
    }

    // Decorate fastify instance with the pool instance
    fastify.decorate('db', pool)

    fastify.addHook('onClose', async (instance) => {
        await pool.end()
    })
}

export default fp(dbConnector)

declare module 'fastify' {
    interface FastifyInstance {
        db: Pool
    }
}
