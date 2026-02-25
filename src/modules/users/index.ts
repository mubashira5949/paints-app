
import { FastifyInstance } from 'fastify'
import bcrypt from 'bcrypt'

export default async function (fastify: FastifyInstance) {
    fastify.post('/users', {
        preHandler: [fastify.authenticate],
        schema: {
            body: {
                type: 'object',
                required: ['username', 'password', 'role'],
                properties: {
                    username: { type: 'string' },
                    password: { type: 'string', minLength: 6 },
                    role: { type: 'string' }
                }
            }
        },
        handler: async (request: any, reply: any) => {
            const { username, password, role } = request.body
            const currentUser = request.user

            // Check if current user is manager
            // Note: In a real app, you'd fetch the role name from the DB if it's not in the JWT
            // Assuming the JWT payload has { id, username, role }
            if (currentUser.role !== 'manager') {
                return reply.status(403).send({
                    error: 'Forbidden',
                    message: 'Only Managers can create users'
                })
            }

            try {
                // 1. Check if role exists and get its ID
                const roleResult = await fastify.db.query(
                    'SELECT id FROM roles WHERE name = $1',
                    [role]
                )

                if (roleResult.rows.length === 0) {
                    return reply.status(400).send({
                        error: 'Bad Request',
                        message: `Role '${role}' does not exist`
                    })
                }

                const roleId = roleResult.rows[0].id

                // 2. Hash password
                const saltRounds = 10
                const passwordHash = await bcrypt.hash(password, saltRounds)

                // 3. Create user
                const userResult = await fastify.db.query(
                    'INSERT INTO users (username, password_hash, role_id) VALUES ($1, $2, $3) RETURNING id, username, role_id, created_at',
                    [username, passwordHash, roleId]
                )

                const newUser = userResult.rows[0]

                return reply.status(201).send({
                    message: 'User created successfully',
                    user: {
                        id: newUser.id,
                        username: newUser.username,
                        role: role,
                        created_at: newUser.created_at
                    }
                })
            } catch (err: any) {
                if (err.code === '23505') { // Unique violation
                    return reply.status(400).send({
                        error: 'Bad Request',
                        message: 'Username already exists'
                    })
                }
                fastify.log.error(err)
                return reply.status(500).send({
                    error: 'Internal Server Error',
                    message: 'Failed to create user'
                })
            }
        }
    })

    fastify.delete('/users/:id', {
        preHandler: [fastify.authenticate],
        schema: {
            params: {
                type: 'object',
                required: ['id'],
                properties: {
                    id: { type: 'integer' }
                }
            }
        },
        handler: async (request: any, reply: any) => {
            const { id } = request.params
            const currentUser = request.user

            // Only Managers can delete users
            if (currentUser.role !== 'manager') {
                return reply.status(403).send({
                    error: 'Forbidden',
                    message: 'Only Managers can delete users'
                })
            }

            try {
                const result = await fastify.db.query(
                    'DELETE FROM users WHERE id = $1 RETURNING id, username',
                    [id]
                )

                if (result.rows.length === 0) {
                    return reply.status(404).send({
                        error: 'Not Found',
                        message: 'User not found'
                    })
                }

                return {
                    message: 'User deleted successfully',
                    user: result.rows[0]
                }
            } catch (err) {
                fastify.log.error(err)
                return reply.status(500).send({
                    error: 'Internal Server Error',
                    message: 'Failed to delete user'
                })
            }
        }
    })
}
