import { describe, it, expect, beforeAll, vi } from 'vitest'
import fastify from 'fastify'
import authModule from './index'
import bcrypt from 'bcrypt'

vi.mock('../../utils/deviceInfo', () => ({
    getDeviceFromUserAgent: vi.fn(() => 'Test Device'),
    getLocationFromIp: vi.fn(async () => 'Test Location')
}))

const REAL_HASH = bcrypt.hashSync('password123', 10)

describe('Auth Module - Dynamic Device Enrollment', () => {
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

    it('POST /login should create an enrollment request for unrecognized devices', async () => {
        // 1. Mock user lookup
        app.db.query.mockResolvedValueOnce({ 
            rows: [{ id: 1, username: 'testuser', email: 'test@example.com', password_hash: REAL_HASH, role: 'operator' }] 
        })
        
        // 2. Mock last_login update
        app.db.query.mockResolvedValueOnce({ rows: [] })

        // 3. Mock enrollment check (no approved found)
        app.db.query.mockResolvedValueOnce({ rows: [] })

        // 4. Mock pending request check (no pending found)
        app.db.query.mockResolvedValueOnce({ rows: [] })

        // 5. Mock enrollment request creation
        app.db.query.mockResolvedValueOnce({ rows: [] })

        const response = await app.inject({
            method: 'POST',
            url: '/login',
            body: {
                identifier: 'testuser',
                password: 'password123'
            },
            headers: {
                'user-agent': 'Test Browser'
            }
        })

        if (response.statusCode === 500) {
            console.error('Response Payload:', response.payload)
        }

        expect(response.statusCode).toBe(200)
        expect(JSON.parse(response.payload)).toEqual({ token: 'test-token' })
        
        // Check if device enrollment was triggered
        expect(app.db.query).toHaveBeenCalledWith(
            expect.stringContaining("INSERT INTO device_enrollment_requests"),
            [1, 'Test Device', 'Test Location']
        )
    })
})
