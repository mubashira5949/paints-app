import { describe, it, expect, beforeEach, vi } from 'vitest'
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import inventoryModule from './index'

describe('Inventory Module API', () => {
    let routes: { [method: string]: any } = {}

    // Mock the database client to intercept its query and release methods
    const mockClient = {
        query: vi.fn(),
        release: vi.fn()
    }

    // Mock the Fastify instance, providing simplified versions of our decorators
    const mockFastify = {
        authenticate: async (request: any, reply: any) => {
            if (!request.headers.authorization) {
                throw new Error('Unauthorized')
            }
            const token = request.headers.authorization.split(' ')[1]
            const [role, username] = token.split(':')
            request.user = { id: 1, role, username }
        },
        db: {
            connect: async () => mockClient
        },
        log: {
            error: (err: any) => { }
        },
        get: (path: string, options: any) => {
            routes[`GET ${path}`] = options
        },
        withTypeProvider: () => mockFastify
    }

    // Helper function to create a stateful mocked reply object
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

        // Setup the mock DB query to return the nested grouped mock structure
        mockClient.query.mockResolvedValue({
            rows: [
                {
                    color_id: 1,
                    color_name: 'Ruby Red',
                    color_code: '#E0115F',
                    total_quantity_units: 60,
                    total_volume_kg: '100.00',
                    packs: [
                        { pack_size_kg: '1.00', quantity_units: 50 },
                        { pack_size_kg: '5.00', quantity_units: 10 }
                    ]
                }
            ]
        })

        await inventoryModule(mockFastify as unknown as FastifyInstance)
    })

    describe('GET /finished-stock', () => {
        it('should return 200 and a list of finished stock', async () => {
            const getRoute = routes['GET /finished-stock']
            // Provide a mock request simulating an authorized 'sales' user
            const req = {
                headers: { authorization: 'Bearer sales:testuser' }
            } as unknown as FastifyRequest
            const rep = createMockReply()

            // Run through the preHandler chain (simulate authentication and authorization)
            for (const handler of getRoute.preHandler) { await handler(req, rep) }

            // Execute the main request handler
            await getRoute.handler(req, rep)

            expect((rep as any).getStatusCode()).toBe(200)
            const body = (rep as any).getBody()
            expect(body.data).toHaveLength(1)
            expect(body.data[0].color_name).toBe('Ruby Red')
            expect(body.data[0].total_quantity_units).toBe(60)
            expect(body.data[0].total_volume_kg).toBe('100.00')
            expect(body.data[0].packs).toHaveLength(2)
            expect(body.data[0].packs[0].pack_size_kg).toBe('1.00')
            expect(body.data[0].packs[0].quantity_units).toBe(50)
        })

        it('should return 403 for unauthorized role', async () => {
            const getRoute = routes['GET /finished-stock']
            // Provide a mock request simulating an 'operator' user who lacks inventory access
            const req = {
                headers: { authorization: 'Bearer operator:testoperator' } // Operator cannot view inventory (assume)
            } as unknown as FastifyRequest
            const rep = createMockReply()

            let forbidden = false
            // Execute pre-handlers to trigger the role authorization failure
            for (const handler of getRoute.preHandler) {
                await handler(req, rep)
                if ((rep as any).getStatusCode() !== 200) {
                    forbidden = true;
                    break;
                }
            }

            expect(forbidden).toBe(true)
            expect((rep as any).getStatusCode()).toBe(403)
        })
    })
})
