/**
 * Recipes Module Tests
 * Integration tests verifying the creation and validation of recipes.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import recipesModule from './index'

describe('Recipes Module API', () => {
    let mockRecipes: any[] = []
    let mockRecipeResources: any[] = []
    let routes: { [method: string]: any } = {}

    // Mock PostgreSQKG Client mapping for transactions
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
            request.user = { role, username }
        },
        db: {
            // General query logic outside transactions (used in GET)
            query: async (query: string, params?: any[]) => {
                if (query.includes('FROM recipes')) {
                    const colorId = params![0]
                    const filtered = mockRecipes.filter(r => r.color_id === colorId && r.is_active)
                    return { rows: filtered }
                } else if (query.includes('FROM recipe_resources')) {
                    const recipeIds = params![0]
                    const filtered = mockRecipeResources.filter(rr => recipeIds.includes(rr.recipe_id))
                    // Mocking join with resources table
                    return {
                        rows: filtered.map(rr => ({
                            ...rr,
                            name: 'Mock Resource',
                            unit: 'kg'
                        }))
                    }
                }
                return { rows: [] }
            },
            // Logic for getting connection pool (used in POST /recipes transactions)
            connect: async () => mockClient
        },
        log: {
            error: (err: any) => { } // silent log
        },
        get: (path: string, options: any) => {
            routes[`GET ${path}`] = options
        },
        post: (path: string, options: any) => {
            routes[`POST ${path}`] = options
        },
        put: (path: string, options: any) => {
            routes[`PUT ${path}`] = options
        },
        delete: (path: string, options: any) => {
            routes[`DELETE ${path}`] = options
        },
        withTypeProvider: () => mockFastify
    }

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
        mockRecipes = []
        mockRecipeResources = []
        routes = {}
        vi.clearAllMocks()

        // Setup initial transactional query responses
        mockClient.query.mockImplementation(async (query: string, params?: any[]) => {
            if (query === 'BEGIN' || query === 'COMMIT' || query === 'ROLLBACK') return

            if (query.includes('INSERT INTO recipes')) {
                const newRecipe = {
                    id: mockRecipes.length + 1,
                    color_id: params![0],
                    name: params![1],
                    version: params![2],
                    batch_size_kg: params![3],
                    is_active: true,
                    created_at: new Date().toISOString()
                }
                mockRecipes.push(newRecipe)
                return { rows: [newRecipe] }
            } else if (query.includes('INSERT INTO recipe_resources')) {
                const newRR = {
                    id: mockRecipeResources.length + 1,
                    recipe_id: params![0],
                    resource_id: params![1],
                    quantity_required: params![2]
                }
                mockRecipeResources.push(newRR)
                return { rows: [newRR] }
            }
            return { rows: [] }
        })

        await recipesModule(mockFastify as unknown as FastifyInstance)
    })

    describe('POST /recipes', () => {
        it('should execute transactional inserts successfully for authorized manager', async () => {
            const postRoute = routes['POST /']
            const req = {
                headers: { authorization: 'Bearer manager:testuser' },
                body: {
                    color_id: 1,
                    name: 'Test Setup 1',
                    batch_size_kg: 100,
                    resources: [{ resource_id: 10, quantity_required: 5 }]
                }
            } as unknown as FastifyRequest
            const rep = createMockReply()

            for (const handler of postRoute.preHandler) { await handler(req, rep) }
            await postRoute.handler(req, rep)

            expect((rep as any).getStatusCode()).toBe(201)

            // Verify that the transactional boundary was executed in order
            expect(mockClient.query).toHaveBeenNthCalledWith(1, 'BEGIN')
            expect(mockClient.query).toHaveBeenNthCalledWith(2, expect.stringContaining('INSERT INTO recipes'), expect.any(Array))
            expect(mockClient.query).toHaveBeenNthCalledWith(3, expect.stringContaining('INSERT INTO recipe_resources'), expect.any(Array))
            expect(mockClient.query).toHaveBeenNthCalledWith(4, expect.stringContaining('INSERT INTO audit_logs'), expect.any(Array))
            expect(mockClient.query).toHaveBeenNthCalledWith(5, 'COMMIT')
            expect(mockClient.release).toHaveBeenCalledTimes(1)
        })

        it('should block unauthorized execution and rollback transaction on SQKG error', async () => {
            const postRoute = routes['POST /']

            // Setup a mock error occurring during insertion
            mockClient.query.mockImplementationOnce(async (q) => { if (q === 'BEGIN') return })
                .mockImplementationOnce(async () => { throw new Error('DB Error') })

            const req = {
                headers: { authorization: 'Bearer admin:testuser' },
                body: {
                    color_id: 2,
                    name: 'Bad Route',
                    batch_size_kg: 10,
                    resources: [{ resource_id: 5, quantity_required: 2 }]
                }
            } as unknown as FastifyRequest
            const rep = createMockReply()

            for (const handler of postRoute.preHandler) { await handler(req, rep) }
            await postRoute.handler(req, rep)

            expect((rep as any).getStatusCode()).toBe(500)

            // Should catch error and rollback transaction
            expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK')
            expect(mockClient.release).toHaveBeenCalledTimes(1)
        })

        it('should correctly reject standard users from access', async () => {
            const postRoute = routes['POST /']
            const req = {
                headers: { authorization: 'Bearer user:testuser' },
                body: { color_id: 1, name: 'T', batch_size_kg: 1, resources: [{ resource_id: 1, quantity_required: 1 }] }
            } as unknown as FastifyRequest
            const rep = createMockReply()

            for (const handler of postRoute.preHandler) {
                await handler(req, rep)
                if ((rep as any).getStatusCode() !== 200) break;
            }

            expect((rep as any).getStatusCode()).toBe(403)
        })
    })

    describe('GET /recipes/:colorId', () => {
        it('should join and return aggregated recipe resources for authenticated personnel', async () => {
            mockRecipes.push({ id: 99, color_id: 55, name: 'Existing Recipe', version: '1.0.0', batch_size_kg: 50, is_active: true })
            mockRecipeResources.push({ recipe_id: 99, resource_id: 101, quantity_required: 15 })

            const getRoute = routes['GET /:colorId']
            const req = {
                headers: { authorization: 'Bearer user:testuser' },
                params: { colorId: 55 }
            } as unknown as FastifyRequest
            const rep = createMockReply()

            for (const handler of getRoute.preHandler) { await handler(req, rep) }
            await getRoute.handler(req, rep)

            expect((rep as any).getStatusCode()).toBe(200)
            const body = (rep as any).getBody()
            expect(Array.isArray(body)).toBe(true)
            expect(body.length).toBe(1)
            expect(body[0].name).toBe('Existing Recipe')
            expect(body[0].resources.length).toBe(1)
            expect(body[0].resources[0].resource_id).toBe(101)
            expect(body[0].resources[0].quantity_required).toBe(15)
        })
    })

    describe('POST /recipes/:id/resources', () => {
        beforeEach(() => {
            // Setup additional routing mocks specifically for simple query validation
            vi.spyOn(mockFastify.db, 'query').mockImplementation(async (query: string, params?: any[]) => {
                if (query.includes('FROM recipes')) {
                    const id = params![0]
                    if (id === 99) return { rows: [{ id: 99 }] }
                    return { rows: [] }
                } else if (query.includes('FROM resources')) {
                    const id = params![0]
                    if (id === 101) return { rows: [{ id: 101 }] }
                    return { rows: [] }
                } else if (query.includes('INSERT INTO recipe_resources')) {
                    // Simulate uniqueness rejection
                    if (params![0] === 99 && params![1] === 102) {
                        const error = new Error('Duplicate key')
                            ; (error as any).code = '23505'
                        throw error
                    }
                    const newRR = { id: 1, recipe_id: params![0], resource_id: params![1], quantity_required: params![2] }
                    return { rows: [newRR] }
                }
                return { rows: [] }
            })
        })

        it('should append a valid resource to an existing recipe successfully', async () => {
            const postResourceRoute = routes['POST /:id/resources']
            const req = {
                headers: { authorization: 'Bearer admin:testuser' },
                params: { id: 99 },
                body: { resource_id: 101, quantity_required: 20 }
            } as unknown as FastifyRequest
            const rep = createMockReply()

            for (const handler of postResourceRoute.preHandler) { await handler(req, rep) }
            await postResourceRoute.handler(req, rep)

            // Assert that the resource mapping was successful
            expect((rep as any).getStatusCode()).toBe(201)
            expect((rep as any).getBody().message).toBe('Resource added to recipe successfully')
            expect((rep as any).getBody().recipe_resource.resource_id).toBe(101)
            expect((rep as any).getBody().recipe_resource.quantity_required).toBe(20)
        })

        it('should return 404 if the requested recipe does not exist', async () => {
            const postResourceRoute = routes['POST /:id/resources']
            const req = {
                headers: { authorization: 'Bearer manager:testuser' },
                params: { id: 88 }, // invalid recipe
                body: { resource_id: 101, quantity_required: 10 }
            } as unknown as FastifyRequest
            const rep = createMockReply()

            for (const handler of postResourceRoute.preHandler) { await handler(req, rep) }
            await postResourceRoute.handler(req, rep)

            expect((rep as any).getStatusCode()).toBe(404)
            expect((rep as any).getBody().message).toBe('Recipe not found')
        })

        it('should return 404 if the requested resource does not exist', async () => {
            const postResourceRoute = routes['POST /:id/resources']
            const req = {
                headers: { authorization: 'Bearer manager:testuser' },
                params: { id: 99 },
                body: { resource_id: 77, quantity_required: 10 } // invalid resource
            } as unknown as FastifyRequest
            const rep = createMockReply()

            for (const handler of postResourceRoute.preHandler) { await handler(req, rep) }
            await postResourceRoute.handler(req, rep)

            expect((rep as any).getStatusCode()).toBe(404)
            expect((rep as any).getBody().message).toBe('Resource not found')
        })

        it('should return 400 if the resource is already mapped to the recipe', async () => {
            const postResourceRoute = routes['POST /:id/resources']
            // Using our mock implementation: resource 102 will trigger unique fault
            // but we must make sure resource 102 passes the resource exist validation first
            vi.spyOn(mockFastify.db, 'query').mockImplementation(async (query: string, params?: any[]) => {
                if (query.includes('FROM recipes')) return { rows: [{ id: 99 }] }
                if (query.includes('FROM resources')) return { rows: [{ id: 102 }] }
                if (query.includes('INSERT INTO recipe_resources')) {
                    const error = new Error('Duplicate key')
                        ; (error as any).code = '23505'
                    throw error
                }
                return { rows: [] }
            })

            const req = {
                headers: { authorization: 'Bearer admin:testuser' },
                params: { id: 99 },
                body: { resource_id: 102, quantity_required: 15 }
            } as unknown as FastifyRequest
            const rep = createMockReply()

            for (const handler of postResourceRoute.preHandler) { await handler(req, rep) }
            await postResourceRoute.handler(req, rep)

            expect((rep as any).getStatusCode()).toBe(400)
            expect((rep as any).getBody().message).toBe('This resource is already added to the specified recipe')
        })
    })
})
