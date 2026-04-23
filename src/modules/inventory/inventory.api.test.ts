import { describe, it, expect, beforeEach, vi } from 'vitest'
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import inventoryApi from './inventory.api'

describe('Inventory API Module', () => {
    let routes: { [method: string]: any } = {}

    const mockClient = {
        query: vi.fn(),
        release: vi.fn()
    }

    const mockFastify = {
        authenticate: async (request: any, reply: any) => {
            request.user = { id: 1, role: 'admin', username: 'testadmin' }
        },
        db: {
            query: vi.fn(),
            connect: async () => mockClient
        },
        log: {
            error: (err: any) => { }
        },
        get: (path: string, options: any) => {
            routes[`GET ${path}`] = options
        },
        post: (path: string, options: any) => {
            routes[`POST ${path}`] = options
        },
        withTypeProvider: () => mockFastify
    }

    const createMockReply = () => {
        let statusCode = 200;
        let responseBody: any = null;
        return {
            status: (code: number) => {
                statusCode = code;
                return { send: (body: any) => { responseBody = body; } }
            },
            send: (body: any) => { responseBody = body; },
            getStatusCode: () => statusCode,
            getBody: () => responseBody
        } as unknown as FastifyReply
    }

    beforeEach(async () => {
        routes = {}
        vi.clearAllMocks()
        await inventoryApi(mockFastify as unknown as FastifyInstance)
    })

    describe('GET /summary', () => {
        it('should return inventory summary', async () => {
            const getRoute = routes['GET /summary']
            const req = {} as unknown as FastifyRequest
            const rep = createMockReply()

            // Mock DB responses
            mockFastify.db.query.mockImplementation((queryText: string) => {
                if (queryText.includes('COALESCE(SUM(quantity_units * pack_size_kg), 0)')) {
                    return Promise.resolve({
                        rows: [{ totalMass: 146, packagedUnits: 22 }]
                    })
                }
                if (queryText.includes('SELECT COUNT(*) as "lowStockColors"')) {
                    return Promise.resolve({
                        rows: [{ lowStockColors: '2' }]
                    })
                }
                return Promise.resolve({ rows: [] })
            })

            await getRoute.handler(req, rep)
            const result = (rep as any).getBody()

            expect(result).toEqual({
                totalMass: 146,
                packagedUnits: 22,
                lowStockColors: 2
            })
        })
    })

    describe('GET /', () => {
        it('should return filtered inventory data', async () => {
            const getRoute = routes['GET /']
            const req = {
                query: { search: 'blue', status: 'low' }
            } as unknown as FastifyRequest
            const rep = createMockReply()

            mockFastify.db.query.mockResolvedValue({
                rows: [
                    {
                        color: 'Blue 401',
                        series: 'Water Based',
                        packDistribution: [
                            { size: '5kg', units: 10 },
                            { size: '8kg', units: 12 }
                        ],
                        units: 22,
                        mass: 146,
                        status: 'low'
                    }
                ]
            })

            await getRoute.handler(req, rep)
            const result = (rep as any).getBody()

            expect(result).toHaveLength(1)
            expect(result[0].color).toBe('Blue 401')
            expect(result[0].status).toBe('low')
        })
    })
})
