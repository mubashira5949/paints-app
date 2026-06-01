/**
 * Smoke-level tests for the users module. SQL is now in queries.sql and runs
 * through pgtyped, so these tests only assert request/response shape — the
 * SQL is covered by integration runs.
 */

import { describe, it, expect, beforeAll, vi } from 'vitest'
import fastify from 'fastify'
import userModule from './index'

vi.mock('../../utils/authorizeRole', () => ({
    authorizeRole: () => (_req: any, _reply: any, done: any) => done(),
}))

describe('User module — endpoint contract', () => {
    let app: any

    beforeAll(async () => {
        app = fastify()
        app.decorate('authenticate', async (request: any) => {
            request.user = { id: 1, role: 'manager' }
        })
        app.decorate('db', { query: vi.fn(async () => ({ rows: [] })) })
        await app.register(userModule)
    })

    it('GET /users/device-requests returns 200 with an array', async () => {
        app.db.query.mockResolvedValueOnce({ rows: [] })
        const res = await app.inject({ method: 'GET', url: '/users/device-requests' })
        expect(res.statusCode).toBe(200)
        expect(JSON.parse(res.payload)).toEqual([])
    })

    it('POST /users/device-requests/:id/approve returns 200 when row updated', async () => {
        app.db.query.mockResolvedValueOnce({ rows: [{ user_id: 5 }] })
        const res = await app.inject({ method: 'POST', url: '/users/device-requests/1/approve' })
        expect(res.statusCode).toBe(200)
        expect(JSON.parse(res.payload)).toEqual({ message: 'Device approved' })
    })

    it('POST /users/device-requests/:id/reject returns 200 when row updated', async () => {
        app.db.query.mockResolvedValueOnce({ rows: [{ id: 1 }] })
        const res = await app.inject({ method: 'POST', url: '/users/device-requests/1/reject' })
        expect(res.statusCode).toBe(200)
        expect(JSON.parse(res.payload)).toEqual({ message: 'Device rejected' })
    })

    it('POST /users creates a user (201) when role + email valid', async () => {
        app.db.query.mockResolvedValueOnce({
            rows: [{ id: 1, username: 'u', email: 'u@x.com', role: 'manager', is_active: false, created_at: new Date() }],
        })
        const res = await app.inject({
            method: 'POST', url: '/users',
            body: { username: 'u', email: 'u@x.com', password: 'password123', role: 'manager' },
        })
        expect(res.statusCode).toBe(201)
    })
})
