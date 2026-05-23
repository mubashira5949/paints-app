/**
 * User Module — spec §2 (roles) + §2.2 (device approval).
 */

import { FastifyInstance } from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'
import bcrypt from 'bcrypt'
import { authorizeRole } from '../../utils/authorizeRole'
import {
    insertUser, listUsers, usersSummary, listRoles,
    patchUser, deleteUser, resetUserPassword,
    listPendingDeviceRequests, approveDevice, rejectDevice,
} from '../../queries'

export default async function (fastifyRaw: FastifyInstance) {
    const fastify = fastifyRaw.withTypeProvider<TypeBoxTypeProvider>()

    const CreateUserSchema = Type.Object({
        username: Type.String(),
        email:    Type.String({ format: 'email' }),
        password: Type.String({ minLength: 6 }),
        role:     Type.String(),
    })
    const UserIdSchema = Type.Object({ id: Type.Integer() })
    const UpdateUserSchema = Type.Object({
        username:  Type.Optional(Type.String()),
        email:     Type.Optional(Type.String({ format: 'email' })),
        role:      Type.Optional(Type.String()),
        password:  Type.Optional(Type.String({ minLength: 6 })),
        is_active: Type.Optional(Type.Boolean()),
    })

    fastify.post('/users', {
        preHandler: [fastify.authenticate, authorizeRole(['manager'])],
        schema: { body: CreateUserSchema },
        handler: async (request, reply) => {
            const { username, email, password, role } = request.body
            try {
                const password_hash = await bcrypt.hash(password, 10)
                const [newUser] = await insertUser.run({ username, email, password_hash, role: role as any }, fastify.db)
                return reply.status(201).send({
                    message: 'User created successfully',
                    user: {
                        id: newUser.id, username: newUser.username, email: newUser.email,
                        role: newUser.role, is_active: newUser.is_active, created_at: newUser.created_at,
                    },
                })
            } catch (err: any) {
                if (err.code === '23505') return reply.status(400).send({ error: 'Bad Request', message: 'Username or Email already exists' })
                if (err.code === '22P02') return reply.status(400).send({ error: 'Bad Request', message: `Role '${role}' does not exist` })
                fastify.log.error(err)
                return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to create user' })
            }
        },
    })

    fastify.get('/users', {
        preHandler: [fastify.authenticate, authorizeRole(['manager', 'admin'])],
        handler: async () => listUsers.run(undefined as any, fastify.db),
    })

    fastify.get('/users/summary', {
        preHandler: [fastify.authenticate, authorizeRole(['manager', 'admin'])],
        handler: async () => (await usersSummary.run(undefined as any, fastify.db))[0],
    })

    fastify.get('/roles', {
        preHandler: [fastify.authenticate, authorizeRole(['manager', 'admin'])],
        handler: async () => listRoles.run(undefined as any, fastify.db),
    })

    fastify.patch('/users/:id', {
        preHandler: [fastify.authenticate, authorizeRole(['manager', 'admin'])],
        schema: { params: UserIdSchema, body: UpdateUserSchema },
        handler: async (request, reply) => {
            const { id } = request.params
            const updates = request.body
            if (!updates.username && !updates.email && !updates.role && !updates.password && updates.is_active === undefined) {
                return reply.status(400).send({ message: 'No fields to update' })
            }
            const password_hash = updates.password ? await bcrypt.hash(updates.password, 10) : null
            try {
                const rows = await patchUser.run({
                    id,
                    username:      updates.username ?? null,
                    email:         updates.email ?? null,
                    role:          (updates.role ?? null) as any,
                    password_hash,
                    is_active:     updates.is_active ?? null,
                }, fastify.db)
                if (rows.length === 0) return reply.status(404).send({ message: 'User not found' })
                return { message: 'User updated successfully', user: rows[0] }
            } catch (err: any) {
                if (err.code === '22P02') return reply.status(400).send({ error: 'Bad Request', message: `Role '${updates.role}' does not exist` })
                fastify.log.error(err)
                return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to update user' })
            }
        },
    })

    fastify.delete('/users/:id', {
        preHandler: [fastify.authenticate, authorizeRole(['manager', 'admin'])],
        schema: { params: UserIdSchema },
        handler: async (request, reply) => {
            const rows = await deleteUser.run({ id: request.params.id }, fastify.db)
            if (rows.length === 0) return reply.status(404).send({ error: 'Not Found', message: 'User not found' })
            return { message: 'User deleted successfully', user: rows[0] }
        },
    })

    /**
     * POST /users/:id/reset-password  — spec §5 manager-triggered reset.
     * NULLs the password_hash and flags `password_reset_required`; the user's
     * next /auth/login attempt is signalled to set a new password.
     */
    fastify.post('/users/:id/reset-password', {
        preHandler: [fastify.authenticate, authorizeRole(['manager', 'admin'])],
        schema: { params: UserIdSchema },
        handler: async (request, reply) => {
            const rows = await resetUserPassword.run({ id: request.params.id }, fastify.db)
            if (rows.length === 0) return reply.status(404).send({ error: 'Not Found', message: 'User not found' })
            return { message: 'Password cleared; user must set a new one on next login', user: rows[0] }
        },
    })

    // ---- device approval (spec §2.2) ----

    fastify.get('/users/device-requests', {
        preHandler: [fastify.authenticate, authorizeRole(['manager', 'admin'])],
        handler: async () => listPendingDeviceRequests.run(undefined as any, fastify.db),
    })

    fastify.post('/users/device-requests/:id/approve', {
        preHandler: [fastify.authenticate, authorizeRole(['manager', 'admin'])],
        schema: { params: UserIdSchema },
        handler: async (request, reply) => {
            const user = request.user as any
            const rows = await approveDevice.run({ id: request.params.id, approver_id: user.id }, fastify.db)
            if (rows.length === 0) return reply.status(404).send({ message: 'Request not found' })
            return { message: 'Device approved' }
        },
    })

    fastify.post('/users/device-requests/:id/reject', {
        preHandler: [fastify.authenticate, authorizeRole(['manager', 'admin'])],
        schema: { params: UserIdSchema },
        handler: async (request, reply) => {
            const rows = await rejectDevice.run({ id: request.params.id }, fastify.db)
            if (rows.length === 0) return reply.status(404).send({ message: 'Request not found' })
            return { message: 'Device rejected' }
        },
    })
}
