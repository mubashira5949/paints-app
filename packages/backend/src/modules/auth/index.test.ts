import { describe, it, expect, beforeAll, vi } from 'vitest'
import fastify from 'fastify'
import authModule from './index'
import bcrypt from 'bcrypt'

const REAL_HASH = bcrypt.hashSync('password123', 10)
const CLIENT_ID = '550e8400-e29b-41d4-a716-446655440000'

describe('Auth Module - Device approval (spec §2.2)', () => {
    let app: any

    beforeAll(async () => {
        app = fastify()
        app.decorate('db', {
            query: vi.fn()
        })
        app.decorate('jwt', {
            sign: vi.fn(() => 'test-token')
        })
        await app.register(authModule)
    })

    it('POST /login on a new device records pending user_devices row and returns 403', async () => {
        // 1. user lookup
        app.db.query.mockResolvedValueOnce({
            rows: [{ id: 1, username: 'testuser', email: 'test@example.com', password_hash: REAL_HASH, role: 'operator' }]
        })
        // 2. device lookup — none yet
        app.db.query.mockResolvedValueOnce({ rows: [] })
        // 3. pending insert
        app.db.query.mockResolvedValueOnce({ rows: [] })

        const response = await app.inject({
            method: 'POST',
            url: '/login',
            body: {
                identifier: 'testuser',
                password: 'password123',
                clientId: CLIENT_ID,
            },
            headers: { 'user-agent': 'Test Browser' }
        })

        expect(response.statusCode).toBe(403)
        expect(JSON.parse(response.payload)).toMatchObject({
            code: 'device_pending_approval',
        })
        expect(app.db.query).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO user_devices'),
            expect.arrayContaining([1, CLIENT_ID])
        )
    })

    it('POST /login on an approved device issues a token', async () => {
        app.db.query.mockResolvedValueOnce({
            rows: [{ id: 1, username: 'testuser', email: 'test@example.com', password_hash: REAL_HASH, role: 'operator' }]
        })
        app.db.query.mockResolvedValueOnce({ rows: [{ status: 'approved' }] })
        app.db.query.mockResolvedValueOnce({ rows: [] }) // update last_seen_ip
        app.db.query.mockResolvedValueOnce({ rows: [] }) // update last_login

        const response = await app.inject({
            method: 'POST',
            url: '/login',
            body: {
                identifier: 'testuser',
                password: 'password123',
                clientId: CLIENT_ID,
            },
        })

        expect(response.statusCode).toBe(200)
        expect(JSON.parse(response.payload)).toEqual({ token: 'test-token' })
    })
})
