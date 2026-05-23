/**
 * Authentication Module
 *
 *   POST /auth/login         — credentials (+ clientId).  May return:
 *                                200 { token }
 *                                401 invalid credentials
 *                                403 device_pending_approval / device_rejected
 *                                403 password_reset_required   (spec §5)
 *   POST /auth/set-password  — only when the user is in the "must reset"
 *                              state (`password_hash IS NULL` or
 *                              `password_reset_required = TRUE`). Same
 *                              device-approval gate as /login.
 *   GET  /auth/public-key    — ES256 public key for external token verification
 */

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'
import bcrypt from 'bcrypt'
import { getDeviceFromUserAgent } from '../../utils/deviceInfo'
import {
    getUserByUsernameOrEmail,
    getDeviceStatus,
    insertPendingDevice,
    upsertApprovedDevice,
    updateDeviceLastSeen,
    updateUserLastLogin,
    setUserPasswordIfReset,
    type IGetUserByUsernameOrEmailResult,
} from '../../queries'
import type { Route } from '../../types/api'

type LoginResponse     = Route<'/auth/login', 'post'>['Response']
type PublicKeyResponse = Route<'/auth/public-key', 'get'>['Response']

const Identifier = Type.String({ minLength: 1, description: 'Email address or username' })
const ClientId   = Type.String({ format: 'uuid', description: 'Random UUID stored per-device (spec §2.2)' })

export default async function (fastifyRaw: FastifyInstance) {
    const fastify = fastifyRaw.withTypeProvider<TypeBoxTypeProvider>()

    fastify.post('/login', {
        schema: {
            body: Type.Object({
                identifier: Identifier,
                password:   Type.String({ minLength: 1 }),
                clientId:   ClientId,
            }),
        },
        handler: async (request, reply) => {
            const { identifier, password, clientId } = request.body
            try {
                const [user] = await getUserByUsernameOrEmail.run({ upn: identifier }, fastify.db)
                if (!user) return reply.status(401).send({ error: 'Unauthorized', message: 'Invalid credentials' })

                // Spec §5: NULL password_hash OR password_reset_required = true means
                // the user must set a new password before continuing. Don't run bcrypt
                // (constant 401 anyway); signal the frontend to switch UIs.
                if (!user.password_hash || user.password_reset_required) {
                    return reply.status(403).send({
                        error:   'Forbidden',
                        code:    'password_reset_required',
                        message: 'Set a new password to continue.',
                    })
                }

                const isMatch = await bcrypt.compare(password, user.password_hash)
                if (!isMatch) return reply.status(401).send({ error: 'Unauthorized', message: 'Invalid credentials' })

                const deviceGate = await runDeviceGate(fastify, request, reply, user, clientId)
                if (deviceGate === 'reply-sent') return

                await updateUserLastLogin.run({ user_id: user.id }, fastify.db)
                const response: LoginResponse = { token: signToken(fastify, user) }
                return response
            } catch (err) {
                fastify.log.error(err)
                return reply.status(500).send({ error: 'Internal Server Error', message: 'Login failed' })
            }
        },
    })

    fastify.post('/set-password', {
        schema: {
            body: Type.Object({
                identifier:   Identifier,
                new_password: Type.String({ minLength: 8, maxLength: 255 }),
                clientId:     ClientId,
            }),
        },
        handler: async (request, reply) => {
            const { identifier, new_password, clientId } = request.body
            try {
                const [user] = await getUserByUsernameOrEmail.run({ upn: identifier }, fastify.db)
                if (!user) {
                    // Don't leak whether the user exists — same 403 as "not eligible".
                    return reply.status(403).send({
                        error: 'Forbidden',
                        code:  'not_eligible',
                        message: 'This account is not eligible to set a new password.',
                    })
                }
                if (user.password_hash && !user.password_reset_required) {
                    return reply.status(409).send({
                        error: 'Conflict',
                        code:  'not_eligible',
                        message: 'Ask a Manager to reset this account before setting a new password.',
                    })
                }
                const password_hash = await bcrypt.hash(new_password, 10)
                const updated = await setUserPasswordIfReset.run({ id: user.id, password_hash }, fastify.db)
                if (updated.length === 0) {
                    return reply.status(409).send({ error: 'Conflict', code: 'not_eligible', message: 'No longer eligible.' })
                }

                // Reload with new state so the device gate runs against the updated user.
                const [refreshed] = await getUserByUsernameOrEmail.run({ upn: identifier }, fastify.db)
                if (!refreshed) return reply.status(500).send({ error: 'Internal Server Error', message: 'Lookup failed' })

                const deviceGate = await runDeviceGate(fastify, request, reply, refreshed, clientId)
                if (deviceGate === 'reply-sent') return

                await updateUserLastLogin.run({ user_id: refreshed.id }, fastify.db)
                const response: LoginResponse = { token: signToken(fastify, refreshed) }
                return response
            } catch (err) {
                fastify.log.error(err)
                return reply.status(500).send({ error: 'Internal Server Error', message: 'Set-password failed' })
            }
        },
    })

    fastify.get('/public-key', {
        handler: async (_request, reply) => {
            const rawPublic = process.env.ES_PUBLIC_KEY
            if (!rawPublic) return reply.status(500).send({ error: 'Public key not configured' })
            const response: PublicKeyResponse = {
                algorithm: 'ES256',
                publicKey: rawPublic.replace(/\\n/g, '\n'),
            }
            return response
        },
    })
}

// ---------- shared helpers ----------

function signToken(fastify: FastifyInstance, user: IGetUserByUsernameOrEmailResult): string {
    return fastify.jwt.sign({
        id:       user.id,
        username: user.username,
        email:    user.email,
        role:     user.role,
    })
}

/**
 * Spec §2.2 device approval. Returns:
 *   'ok'          — login may proceed
 *   'reply-sent'  — a 403 was already written; caller must `return`.
 *
 * Managers bypass the gate (we'd otherwise lock the system out — they're the
 * ones who approve other devices). Their device row is still recorded so the
 * audit trail and `user_devices` listing stay complete.
 */
async function runDeviceGate(
    fastify: FastifyInstance,
    request: FastifyRequest,
    reply: FastifyReply,
    user: IGetUserByUsernameOrEmailResult,
    clientId: string,
): Promise<'ok' | 'reply-sent'> {
    const userAgent = request.headers['user-agent']
    const ip        = request.ip
    const label     = getDeviceFromUserAgent(userAgent)

    if (user.role === 'manager') {
        await upsertApprovedDevice.run({
            user_id: user.id, client_id: clientId,
            label, user_agent: userAgent ?? null, last_seen_ip: ip || null,
        }, fastify.db)
        return 'ok'
    }
    const device = await getDeviceStatus.run({ user_id: user.id, client_id: clientId }, fastify.db)
    if (device.length === 0) {
        await insertPendingDevice.run({
            user_id: user.id, client_id: clientId,
            label, user_agent: userAgent ?? null, last_seen_ip: ip || null,
        }, fastify.db)
        reply.status(403).send({
            error: 'Forbidden', code: 'device_pending_approval',
            message: 'This device is awaiting Manager approval.',
        })
        return 'reply-sent'
    }
    const status = device[0].status
    if (status !== 'approved') {
        reply.status(403).send({
            error: 'Forbidden',
            code: status === 'rejected' ? 'device_rejected' : 'device_pending_approval',
            message: status === 'rejected'
                ? 'This device has been rejected by a Manager.'
                : 'This device is awaiting Manager approval.',
        })
        return 'reply-sent'
    }
    await updateDeviceLastSeen.run({ user_id: user.id, client_id: clientId, last_seen_ip: ip || null }, fastify.db)
    return 'ok'
}
