import { describe, it, expect, beforeEach, vi } from 'vitest'
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import productionModule from './index'

describe('Production Runs Module API', () => {
    let routes: { [method: string]: any } = {}

    // Mock PostgreSQL Client mapping for transactions
    const mockClient = {
        query: vi.fn(),
        release: vi.fn()
    }

    const mockFastify = {
        authenticate: async (request: any, reply: any) => {
            if (!request.headers.authorization) {
                throw new Error('Unauthorized')
            }
            const token = request.headers.authorization.split(' ')[1]
            const [role, username] = token.split(':')
            request.user = { id: 10, role, username } // mock user payload
        },
        db: {
            connect: async () => mockClient
        },
        log: {
            error: (err: any) => { } // silent log
        },
        post: (path: string, options: any) => {
            routes[`POST ${path}`] = options
        }
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

        // Setup initial transactional query responses predicting correct schema checks
        mockClient.query.mockImplementation(async (query: string, params?: any[]) => {
            if (query === 'BEGIN' || query === 'COMMIT' || query === 'ROLLBACK') return

            if (query.includes('FROM recipes')) {
                // If it asks for recipe_id 1, mock success
                if (params![0] === 1) return { rows: [{ id: 1, color_id: 10, batch_size_liters: 100 }] }
                return { rows: [] }
            }
            if (query.includes('FROM recipe_resources')) {
                // Mock dependencies for recipe_id 1 (batch_size = 100)
                // expects exactly matching scale:
                // For 200L planned: expected_qty = 20 & 30 respectively
                if (params![0] === 1) return { rows: [{ resource_id: 101, quantity_required: 10 }, { resource_id: 102, quantity_required: 15 }] }
                return { rows: [] }
            }
            if (query.includes('INSERT INTO production_runs')) {
                // return new run ID
                return { rows: [{ id: 999, created_at: new Date().toISOString() }] }
            }
            return { rows: [] }
        })

        await productionModule(mockFastify as unknown as FastifyInstance)
    })

    describe('POST /production-runs', () => {
        it('should execute transactional stock updates successfully for autorized operator', async () => {
            const postRoute = routes['POST /']
            const req = {
                headers: { authorization: 'Bearer operator:testoperator' },
                user: { id: 10 },
                body: {
                    recipe_id: 1,
                    planned_quantity_liters: 200,
                    actual_resources: [{ resource_id: 101, actual_quantity_used: 10 }, { resource_id: 102, actual_quantity_used: 15 }]
                }
            } as unknown as FastifyRequest
            const rep = createMockReply()

            for (const handler of postRoute.preHandler) { await handler(req, rep) }
            await postRoute.handler(req, rep)

            expect((rep as any).getStatusCode()).toBe(201)

            // Verify transactional logic checks
            expect(mockClient.query).toHaveBeenCalledWith('BEGIN')
            expect(mockClient.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO production_runs'), expect.any(Array))
            // Expect stock consumption tracking (relying on PostgreSQL trigger exclusively to update actual stock parameters)
            expect(mockClient.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO production_resource_actuals'), expect.any(Array))
            // Expect finished stock logic
            expect(mockClient.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO finished_stock'), expect.any(Array))

            expect(mockClient.query).toHaveBeenCalledWith('COMMIT')
            expect(mockClient.release).toHaveBeenCalledTimes(1)
        })

        it('should rollback transaction if an invalid recipe is requested', async () => {
            const postRoute = routes['POST /']
            const req = {
                headers: { authorization: 'Bearer manager:testuser' },
                user: { id: 10 },
                body: {
                    recipe_id: 2, // will return empty due to our mock constraint
                    planned_quantity_liters: 200,
                    actual_resources: [{ resource_id: 101, actual_quantity_used: 10 }]
                }
            } as unknown as FastifyRequest
            const rep = createMockReply()

            for (const handler of postRoute.preHandler) { await handler(req, rep) }
            await postRoute.handler(req, rep)

            expect((rep as any).getStatusCode()).toBe(404)
            expect((rep as any).getBody().message).toBe('Valid recipe not found')

            // Should properly close and rollback DB
            expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK')
            expect(mockClient.release).toHaveBeenCalledTimes(1)
        })

        it('should rollback transaction if submitted resources differ from the recipe mapping', async () => {
            const postRoute = routes['POST /']
            const req = {
                headers: { authorization: 'Bearer admin:testuser' },
                user: { id: 10 },
                body: {
                    recipe_id: 1,
                    planned_quantity_liters: 200,
                    actual_resources: [{ resource_id: 999, actual_quantity_used: 10 }] // Invalid payload component for this recipe
                }
            } as unknown as FastifyRequest
            const rep = createMockReply()

            for (const handler of postRoute.preHandler) { await handler(req, rep) }
            await postRoute.handler(req, rep)

            expect((rep as any).getStatusCode()).toBe(400)
            expect((rep as any).getBody().message).toBe('Provided resources do not match the selected recipe blueprint')

            // Should properly close and rollback DB
            expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK')
            expect(mockClient.release).toHaveBeenCalledTimes(1)
        })

        it('should rollback transaction intercepting a database CHECK violation mapping to Insufficient Stock limits', async () => {
            const postRoute = routes['POST /']

            // Re-mock DB connection locally to intercept the constraint during log insertion
            mockClient.query.mockImplementationOnce(async (q) => { if (q === 'BEGIN') return })
                .mockImplementationOnce(async () => { return { rows: [{ id: 1, color_id: 10, batch_size_liters: 100 }] } }) // fetch recipe
                .mockImplementationOnce(async () => { return { rows: [{ resource_id: 101, quantity_required: 10 }] } }) // fetch blueprint
                .mockImplementationOnce(async () => { return { rows: [{ id: 999 }] } }) // fake prod id
                .mockImplementationOnce(async () => { }) // Insert production_resource_actuals ok
                .mockImplementationOnce(async () => {
                    // Trap constraint on 'resource_stock_transactions' indicating native trigger broke check
                    const err = new Error('check_violation')
                        ; (err as any).code = '23514'
                    throw err
                })

            const req = {
                headers: { authorization: 'Bearer manager:testuser' },
                user: { id: 10 },
                body: {
                    recipe_id: 1,
                    planned_quantity_liters: 200,
                    actual_resources: [{ resource_id: 101, actual_quantity_used: 10000 }] // enormous depletion expected to trip bound 
                }
            } as unknown as FastifyRequest
            const rep = createMockReply()

            for (const handler of postRoute.preHandler) { await handler(req, rep) }
            await postRoute.handler(req, rep)

            expect((rep as any).getStatusCode()).toBe(400)
            expect((rep as any).getBody().message).toBe('Insufficient raw materials stock exists in inventory to complete this run.')

            // Should properly close and rollback DB
            expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK')
            expect(mockClient.release).toHaveBeenCalledTimes(1)
        })

        it('should correctly reject standard users from establishing production runs', async () => {
            const postRoute = routes['POST /']
            const req = {
                headers: { authorization: 'Bearer user:testuser' }, // Not listed in authorized arrays
                body: {}
            } as unknown as FastifyRequest
            const rep = createMockReply()

            for (const handler of postRoute.preHandler) {
                await handler(req, rep)
                if ((rep as any).getStatusCode() !== 200) break;
            }

            expect((rep as any).getStatusCode()).toBe(403)
        })

        it('should correctly mark variance flags if actual limits exceed 5% deviation', async () => {
            const postRoute = routes['POST /']
            const req = {
                headers: { authorization: 'Bearer manager:testuser' },
                user: { id: 10 },
                body: {
                    recipe_id: 1,
                    planned_quantity_liters: 200,
                    actual_resources: [
                        { resource_id: 101, actual_quantity_used: 20 }, // Exact expected amount (200 / 100 * 10) = 20
                        { resource_id: 102, actual_quantity_used: 50 }  // Extreme deviation! (200 / 100 * 15) = 30. Diff is 20 > 5% limit!
                    ]
                }
            } as unknown as FastifyRequest
            const rep = createMockReply()

            for (const handler of postRoute.preHandler) { await handler(req, rep) }
            await postRoute.handler(req, rep)

            expect((rep as any).getStatusCode()).toBe(201)

            // Expected mapping assertions (checking arguments built for the mockClient query)
            const insertActualsCalls = mockClient.query.mock.calls.filter(call => call[0].includes('INSERT INTO production_resource_actuals'))

            // First item (101): Expected 20, Received 20. Variance: 0. Flag: false.
            expect(insertActualsCalls[0][1]).toEqual([999, 101, 20, 20, 0, false])
            // Second item (102): Expected 30, Received 50. Variance: 20. Flag: true.
            expect(insertActualsCalls[1][1]).toEqual([999, 102, 50, 30, 20, true])
        })
    })
})
