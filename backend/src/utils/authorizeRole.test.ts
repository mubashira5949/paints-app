/**
 * authorizeRole.test.ts
 * Unit tests for the RBAC middleware.
 * Verifies that authorized roles pass and unauthorized roles are rejected.
 */

import { describe, it, expect } from 'vitest'
import { authorizeRole } from './authorizeRole'
import { FastifyRequest, FastifyReply } from 'fastify'

describe('authorizeRole middleware', () => {
    const mockMiddleware = authorizeRole(['manager', 'admin'])

    const createMockReply = () => {
        let statusCode = 200;
        let responseBody: any = null;
        return {
            status: (code: number) => {
                statusCode = code;
                return {
                    send: (body: any) => {
                        responseBody = body;
                    }
                }
            },
            send: (body: any) => {
                responseBody = body;
            },
            getStatusCode: () => statusCode,
            getBody: () => responseBody
        } as unknown as FastifyReply
    }

    it('should allow user with manager role', async () => {
        const req = { user: { role: 'manager' } } as unknown as FastifyRequest
        const rep = createMockReply()
        await mockMiddleware(req, rep)
        expect((rep as any).getStatusCode()).toBe(200)
    })

    it('should allow user with admin role', async () => {
        const req = { user: { role: 'admin' } } as unknown as FastifyRequest
        const rep = createMockReply()
        await mockMiddleware(req, rep)
        expect((rep as any).getStatusCode()).toBe(200)
    })

    it('should deny user with unauthorized role', async () => {
        const req = { user: { role: 'user' } } as unknown as FastifyRequest
        const rep = createMockReply()
        await mockMiddleware(req, rep)
        expect((rep as any).getStatusCode()).toBe(403)
        expect((rep as any).getBody().error).toBe('Forbidden')
    })

    it('should deny if user has no role defined', async () => {
        const req = { user: {} } as unknown as FastifyRequest
        const rep = createMockReply()
        await mockMiddleware(req, rep)
        expect((rep as any).getStatusCode()).toBe(403)
    })

    it('should deny if request has no user defined', async () => {
        const req = {} as unknown as FastifyRequest
        const rep = createMockReply()
        await mockMiddleware(req, rep)
        expect((rep as any).getStatusCode()).toBe(403)
    })
})
