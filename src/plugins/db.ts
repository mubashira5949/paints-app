
import fp from 'fastify-plugin'
import Database from 'better-sqlite3'
import { FastifyInstance } from 'fastify'

async function dbConnector(fastify: FastifyInstance) {
    const db = new Database('data.db', { verbose: console.log });

    // Decorate fastify instance with the database instance
    fastify.decorate('db', db)
}

export default fp(dbConnector)

declare module 'fastify' {
    interface FastifyInstance {
        db: Database.Database
    }
}
