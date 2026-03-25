import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import fastify from 'fastify'
import userModule from './index'

// Mock fastify.authenticate and authorizeRole
vi.mock('../../utils/authorizeRole', () => ({
    authorizeRole: () => (req: any, reply: any, done: any) => done()
}))

vi.mock('../../utils/deviceInfo', () => ({
    getDeviceFromUserAgent: vi.fn(() => 'Test Device'),
    getLocationFromIp: vi.fn(async () => 'Test Location')
}))

describe('User Module - Device Enrollment', () => {
    let app: any

    beforeAll(async () => {
        app = fastify()
        app.decorate('authenticate', async (request: any, reply: any) => {
            request.user = { id: 1, role: 'manager' }
        })
        app.decorate('db', {
            query: vi.fn()
        })
        await app.register(userModule)
    })

    it('GET /users/device-requests should return pending requests', async () => {
        const mockRequests = [
            { id: 1, user: 'testuser', device: 'Chrome', location: 'Mumbai', requested_at: new Date(), status: 'pending' }
        ]
        app.db.query.mockResolvedValueOnce({ rows: mockRequests })

        const response = await app.inject({
            method: 'GET',
            url: '/users/device-requests'
        })

        expect(response.statusCode).toBe(200)
        expect(JSON.parse(response.payload)).toEqual(JSON.parse(JSON.stringify(mockRequests)))
        expect(app.db.query).toHaveBeenCalledWith(expect.stringContaining('device_enrollment_requests'))
    })

    it('POST /users/device-requests/:id/approve should update status to approved', async () => {
        app.db.query.mockResolvedValueOnce({ rows: [{ user_id: 1 }] }) // Device request approval
        app.db.query.mockResolvedValueOnce({ rows: [] }) // User activation

        const response = await app.inject({
            method: 'POST',
            url: '/users/device-requests/1/approve'
        })

        expect(response.statusCode).toBe(200)
        expect(JSON.parse(response.payload)).toEqual({ message: 'Device request approved and user activated' })
        expect(app.db.query).toHaveBeenCalledWith(
            expect.stringContaining("UPDATE device_enrollment_requests SET status = 'approved'"),
            [1]
        )
        expect(app.db.query).toHaveBeenCalledWith(
            expect.stringContaining("UPDATE users SET is_active = TRUE"),
            [1]
        )
    })

    it('POST /users/device-requests/:id/reject should update status to rejected', async () => {
        app.db.query.mockResolvedValueOnce({ rows: [{ id: 1, status: 'rejected' }] })

        const response = await app.inject({
            method: 'POST',
            url: '/users/device-requests/1/reject'
        })

        expect(response.statusCode).toBe(200)
        expect(JSON.parse(response.payload)).toEqual({ message: 'Device request rejected' })
        expect(app.db.query).toHaveBeenCalledWith(
            expect.stringContaining("UPDATE device_enrollment_requests SET status = 'rejected'"),
            [1]
        )
    })

    it('POST /users should create a user and a device enrollment request', async () => {
        app.db.query.mockResolvedValueOnce({ rows: [{ id: 10, name: 'manager' }] }) // Role check
        app.db.query.mockResolvedValueOnce({ rows: [{ id: 1, username: 'newuser', email: 'new@test.com', created_at: new Date() }] }) // User creation
        app.db.query.mockResolvedValueOnce({ rows: [] }) // Device request creation

        const response = await app.inject({
            method: 'POST',
            url: '/users',
            body: {
                username: 'newuser',
                email: 'new@test.com',
                password: 'password123',
                role: 'manager'
            }
        })

        expect(response.statusCode).toBe(201)
        expect(app.db.query).toHaveBeenCalledWith(
            expect.stringContaining("INSERT INTO users (username, email, password_hash, role_id, is_active) VALUES ($1, $2, $3, $4, FALSE)"),
            ['newuser', 'new@test.com', expect.any(String), 10]
        )
        expect(app.db.query).toHaveBeenCalledWith(
            expect.stringContaining("INSERT INTO device_enrollment_requests"),
            [1, 'Test Device', 'Test Location']
        )
    })
})
