/**
 * Colors Module Tests
 * Integration tests for the Colors API endpoints.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import colorsModule from './index'

describe('Colors Module API', () => {
    let mockColors: any[] = []
    let routes: { [method: string]: any } = {}

    // Mock Fastify Instance capturing authentication and DB queries
    const mockFastify = {
        authenticate: async (request: any, reply: any) => {
            // Simulate JWT verification middleware
            if (!request.headers.authorization) {
                throw new Error('Unauthorized')
            }
            const token = request.headers.authorization.split(' ')[1]
            const [role, username] = token.split(':')
            request.user = { role, username }
        },
        db: {
            query: async (query: string, params?: any[]) => {
                // Mock simple SELECT query logic
                if (query.includes('SELECT')) {
                    return { rows: mockColors }
                } else if (query.includes('INSERT')) {
                    // Mock INSERT logic to handle color creation and emulate DB constraints
                    const newColor = {
                        id: mockColors.length + 1,
                        name: params![0],
                        color_code: params![1],
                        description: params![2],
                        created_at: new Date().toISOString()
                    }
                    if (mockColors.some(c => c.name === newColor.name)) {
                        const error = new Error('Duplicate key')
                            ; (error as any).code = '23505'
                        throw error
                    }
                    mockColors.push(newColor)
                    return { rows: [newColor] }
                }
                return { rows: [] }
            },
            connect: async () => ({
                query: async (query: string, params?: any[]) => {
                    if (query === 'BEGIN' || query === 'COMMIT' || query === 'ROLLBACK') return

                    if (query.includes('INSERT INTO colors')) {
                        const newColor = {
                            id: mockColors.length + 1,
                            name: params![0],
                            color_code: params![1],
                            description: params![2],
                            created_at: new Date().toISOString()
                        }
                        if (mockColors.some(c => c.name === newColor.name)) {
                            const error = new Error('Duplicate key')
                                ; (error as any).code = '23505'
                            throw error
                        }
                        mockColors.push(newColor)
                        return { rows: [newColor] }
                    } else if (query.includes('INSERT INTO audit_logs')) {
                        return { rows: [] }
                    }
                    return { rows: [] }
                },
                release: vi.fn()
            })
        },
        log: {
            error: (err: any) => { } // silent log for tests
        },
        get: (path: string, options: any) => {
            routes[`GET ${path}`] = options
        },
        post: (path: string, options: any) => {
            routes[`POST ${path}`] = options
        }
    }

    // Helper to simulate a Fastify Reply object for assertions
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

    beforeEach(async () => {
        mockColors = []
        routes = {}
        await colorsModule(mockFastify as unknown as FastifyInstance)
    })

    describe('POST /colors', () => {
        it('should allow admin and manager to create a color', async () => {
            const postRoute = routes['POST /']
            // Provide an authorized mock request object
            const req = {
                headers: { authorization: 'Bearer manager:testuser' },
                body: { name: 'Titanium White', color_code: '#FFFFFF', description: 'Base white paint' }
            } as unknown as FastifyRequest
            const rep = createMockReply()

            for (const handler of postRoute.preHandler) {
                await handler(req, rep)
                if ((rep as any).getStatusCode() !== 200) break;
            }

            if ((rep as any).getStatusCode() === 200) {
                await postRoute.handler(req, rep)
            }

            expect((rep as any).getStatusCode()).toBe(201)
            expect((rep as any).getBody().message).toBe('Color created successfully')
            expect((rep as any).getBody().color).toBeDefined()
        })

        it('should forbid regular users to create a color', async () => {
            const postRoute = routes['POST /']
            const req = {
                headers: { authorization: 'Bearer user:testuser' },
                body: { name: 'Midnight Blue' }
            } as unknown as FastifyRequest
            const rep = createMockReply()

            for (const handler of postRoute.preHandler) {
                await handler(req, rep)
                if ((rep as any).getStatusCode() !== 200) break;
            }

            expect((rep as any).getStatusCode()).toBe(403)
            expect((rep as any).getBody().error).toBe('Forbidden')
        })

        it('should return 400 when duplicating a color name', async () => {
            const postRoute = routes['POST /']
            mockColors.push({ id: 1, name: 'Red', color_code: '#FF0000', description: 'Red paint' })

            const req = {
                headers: { authorization: 'Bearer admin:admin' },
                body: { name: 'Red' }
            } as unknown as FastifyRequest
            const rep = createMockReply()

            for (const handler of postRoute.preHandler) {
                await handler(req, rep)
                if ((rep as any).getStatusCode() !== 200) break;
            }

            if ((rep as any).getStatusCode() === 200) {
                await postRoute.handler(req, rep)
            }

            // Assert that duplicate names trigger a bad request error
            expect((rep as any).getStatusCode()).toBe(400)
            expect((rep as any).getBody().message).toBe('A color with this name already exists')
        })
    })

    describe('GET /colors', () => {
        it('should return a list of colors for any authenticated user', async () => {
            mockColors.push({ id: 1, name: 'Red', color_code: '#FF0000', description: 'Red paint' })
            const getRoute = routes['GET /']
            const req = {
                headers: { authorization: 'Bearer user:testuser' }
            } as unknown as FastifyRequest
            const rep = createMockReply()

            for (const handler of getRoute.preHandler) {
                await handler(req, rep)
                if ((rep as any).getStatusCode() !== 200) break;
            }

            if ((rep as any).getStatusCode() === 200) {
                await getRoute.handler(req, rep)
            }

            expect((rep as any).getStatusCode()).toBe(200)
            const body = (rep as any).getBody()
            expect(Array.isArray(body)).toBe(true)
            expect(body.length).toBe(1)
            expect(body[0].name).toBe('Red')
        })
    })
})
