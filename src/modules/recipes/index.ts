/**
 * Recipes Module
 * Handles operations related to paint recipes and their bill of materials.
 */

import { FastifyInstance } from 'fastify'
import { authorizeRole } from '../../utils/authorizeRole'

export default async function (fastify: FastifyInstance) {
    /**
     * GET /recipes/:colorId - Retrieve active recipes for a specific color.
     * Accessible to all authenticated users.
     */
    fastify.get('/:colorId', {
        // middleware to verify JWT
        preHandler: [fastify.authenticate],
        schema: {
            params: {
                type: 'object',
                required: ['colorId'],
                properties: {
                    colorId: { type: 'integer' }
                }
            }
        },
        handler: async (request: any, reply: any) => {
            const { colorId } = request.params

            try {
                // Fetch the recipes
                const recipesResult = await fastify.db.query(
                    `SELECT id, name, version, batch_size_liters, created_at, updated_at 
                     FROM recipes 
                     WHERE color_id = $1 AND is_active = TRUE 
                     ORDER BY created_at DESC`,
                    [colorId]
                )

                if (recipesResult.rows.length === 0) {
                    return reply.send([])
                }

                const recipes = recipesResult.rows

                // Fetch the resources for all these recipes
                const recipeIds = recipes.map(r => r.id)

                const resourcesResult = await fastify.db.query(
                    `SELECT rr.recipe_id, rr.resource_id, r.name, r.unit, rr.quantity_required
                     FROM recipe_resources rr
                     JOIN resources r ON rr.resource_id = r.id
                     WHERE rr.recipe_id = ANY($1::int[])`,
                    [recipeIds]
                )

                // Group resources by recipe_id
                const resourcesByRecipe: { [key: number]: any[] } = {}
                resourcesResult.rows.forEach(resource => {
                    if (!resourcesByRecipe[resource.recipe_id]) {
                        resourcesByRecipe[resource.recipe_id] = []
                    }
                    resourcesByRecipe[resource.recipe_id].push({
                        resource_id: resource.resource_id,
                        name: resource.name,
                        unit: resource.unit,
                        quantity_required: resource.quantity_required
                    })
                })

                // Attach resources to their respective recipes
                const fullRecipes = recipes.map(recipe => ({
                    ...recipe,
                    resources: resourcesByRecipe[recipe.id] || []
                }))

                return reply.send(fullRecipes)
            } catch (err) {
                fastify.log.error(err)
                return reply.status(500).send({
                    error: 'Internal Server Error',
                    message: 'Failed to retrieve recipes'
                })
            }
        }
    })

    /**
     * POST /recipes - Create a new recipe and its bill of materials.
     * Only accessible by users with 'admin' or 'manager' roles.
     */
    fastify.post('/', {
        // middleware to verify JWT and check user role
        preHandler: [fastify.authenticate, authorizeRole(['admin', 'manager'])],
        // request body validation schema
        schema: {
            body: {
                type: 'object',
                required: ['color_id', 'name', 'batch_size_liters', 'resources'],
                properties: {
                    color_id: { type: 'integer' },
                    name: { type: 'string' },
                    version: { type: 'string', default: '1.0.0' },
                    batch_size_liters: { type: 'number' },
                    resources: {
                        type: 'array',
                        minItems: 1,
                        items: {
                            type: 'object',
                            required: ['resource_id', 'quantity_required'],
                            properties: {
                                resource_id: { type: 'integer' },
                                quantity_required: { type: 'number' }
                            }
                        }
                    }
                }
            }
        },
        handler: async (request: any, reply: any) => {
            const { color_id, name, version, batch_size_liters, resources } = request.body

            // We need a transaction block to ensure both the recipe and its resources are safely committed.
            let client
            try {
                // Get a dedicated client from the pool for the transaction
                client = await fastify.db.connect()
                await client.query('BEGIN')

                // 1. Insert the new recipe
                const recipeResult = await client.query(
                    `INSERT INTO recipes (color_id, name, version, batch_size_liters) 
                     VALUES ($1, $2, $3, $4) 
                     RETURNING id, color_id, name, version, batch_size_liters, is_active, created_at`,
                    [color_id, name, version || '1.0.0', batch_size_liters]
                )

                const newRecipe = recipeResult.rows[0]

                // 2. Insert the recipe's resources (Bill of Materials)
                for (const res of resources) {
                    await client.query(
                        `INSERT INTO recipe_resources (recipe_id, resource_id, quantity_required) 
                         VALUES ($1, $2, $3)`,
                        [newRecipe.id, res.resource_id, res.quantity_required]
                    )
                }

                // Everything succeeded, commit the transaction
                await client.query('COMMIT')

                return reply.status(201).send({
                    message: 'Recipe created successfully',
                    recipe: {
                        ...newRecipe,
                        resources: resources
                    }
                })
            } catch (err: any) {
                // If any error occurs, rollback the changes
                if (client) {
                    await client.query('ROLLBACK')
                }

                // Handle duplicate unique constraint violations from DB if needed
                if (err.code === '23505') {
                    return reply.status(400).send({
                        error: 'Bad Request',
                        message: 'A duplicate entry exists (e.g., duplicated resource in recipe)'
                    })
                }

                // Check for foreign key constraint violation (e.g. invalid color_id or resource_id)
                if (err.code === '23503') {
                    return reply.status(400).send({
                        error: 'Bad Request',
                        message: 'Invalid color_id or resource_id provided'
                    })
                }

                fastify.log.error(err)
                return reply.status(500).send({
                    error: 'Internal Server Error',
                    message: 'Failed to create recipe'
                })
            } finally {
                // Always release the client back to the pool
                if (client) {
                    client.release()
                }
            }
        }
    })
}
