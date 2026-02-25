
import { FastifyInstance } from 'fastify'
import bcrypt from 'bcrypt'

export default async function (fastify: FastifyInstance) {
    fastify.post('/login', {
        schema: {
            body: {
                type: 'object',
                required: ['username', 'password'],
                properties: {
                    username: { type: 'string' },
                    password: { type: 'string' }
                }
            }
        },
        handler: async (request, reply) => {
            const { username, password } = request.body as any

            try {
                // Get user and their role name
                const result = await fastify.db.query(
                    `SELECT u.id, u.username, u.password_hash, r.name as role 
                     FROM users u 
                     JOIN roles r ON u.role_id = r.id 
                     WHERE u.username = $1 AND u.is_active = TRUE`,
                    [username]
                )

                if (result.rows.length === 0) {
                    return reply.status(401).send({
                        error: 'Unauthorized',
                        message: 'Invalid username or password'
                    })
                }

                const user = result.rows[0]

                // Verify password
                const isMatch = await bcrypt.compare(password, user.password_hash)
                if (!isMatch) {
                    return reply.status(401).send({
                        error: 'Unauthorized',
                        message: 'Invalid username or password'
                    })
                }

                // Sign JWT with role name
                const token = fastify.jwt.sign({
                    id: user.id,
                    username: user.username,
                    role: user.role
                })

                return { token }
            } catch (err) {
                fastify.log.error(err)
                return reply.status(500).send({
                    error: 'Internal Server Error',
                    message: 'Login failed'
                })
            }
        }
    })
}
