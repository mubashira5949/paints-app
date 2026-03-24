/**
 * Recipes Module
 * Handles operations related to paint recipes and their bill of materials.
 */

import { FastifyInstance } from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'
import { authorizeRole } from '../../utils/authorizeRole'

export default async function (fastifyRaw: FastifyInstance) {
    const fastify = fastifyRaw.withTypeProvider<TypeBoxTypeProvider>()

    const ColorIdParamSchema = Type.Object({
        colorId: Type.Integer()
    })

    const CreateRecipeSchema = Type.Object({
        color_id: Type.Integer(),
        name: Type.String(),
        version: Type.Optional(Type.String({ default: '1.0.0' })),
        batch_size_liters: Type.Number(),
        resources: Type.Array(
            Type.Object({
                resource_id: Type.Integer(),
                quantity_required: Type.Number()
            }),
            { minItems: 1 }
        )
    })

    const UpdateRecipeSchema = Type.Object({
        name: Type.Optional(Type.String()),
        version: Type.Optional(Type.String()),
        batch_size_liters: Type.Optional(Type.Number()),
        resources: Type.Optional(
            Type.Array(
                Type.Object({
                    resource_id: Type.Integer(),
                    quantity_required: Type.Number()
                }),
                { minItems: 1 }
            )
        )
    })

    const RecipeIdParamSchema = Type.Object({
        id: Type.Integer()
    })

    const AddResourceSchema = Type.Object({
        resource_id: Type.Integer(),
        quantity_required: Type.Number({ exclusiveMinimum: 0 })
    })

    /**
     * GET /recipes/:colorId - Retrieve active recipes for a specific color.
     * Accessible to all authenticated users.
     */
    fastify.get('/:colorId', {
        preHandler: [fastify.authenticate],
        schema: {
            params: ColorIdParamSchema
        },
        handler: async (request, reply) => {
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
        preHandler: [fastify.authenticate, authorizeRole(['admin', 'manager'])],
        schema: {
            body: CreateRecipeSchema
        },
        handler: async (request, reply) => {
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

                // 4. Log the creation in the audit_logs table
                const user = request.user as any
                await client.query(
                    `INSERT INTO audit_logs (user_id, action, entity_type, entity_id)
                     VALUES ($1, 'recipe_created', 'recipe', $2)`,
                    [user.id, newRecipe.id]
                )

                // 5. Commit Transaction
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

    /**
     * POST /recipes/:id/resources - Add a resource to an existing recipe.
     * Only accessible by users with 'admin' or 'manager' roles.
     */
    fastify.post('/:id/resources', {
        preHandler: [fastify.authenticate, authorizeRole(['admin', 'manager'])],
        schema: {
            params: RecipeIdParamSchema,
            body: AddResourceSchema
        },
        handler: async (request, reply) => {
            const { id } = request.params
            const { resource_id, quantity_required } = request.body

            try {
                // 1. Validate that the recipe exists
                const recipeCheck = await fastify.db.query(
                    'SELECT id FROM recipes WHERE id = $1',
                    [id]
                )
                if (recipeCheck.rows.length === 0) {
                    return reply.status(404).send({
                        error: 'Not Found',
                        message: 'Recipe not found'
                    })
                }

                // 2. Validate that the resource exists
                const resourceCheck = await fastify.db.query(
                    'SELECT id FROM resources WHERE id = $1',
                    [resource_id]
                )
                if (resourceCheck.rows.length === 0) {
                    return reply.status(404).send({
                        error: 'Not Found',
                        message: 'Resource not found'
                    })
                }

                // 3. Insert the resource link (Bill of Materials entry)
                const result = await fastify.db.query(
                    `INSERT INTO recipe_resources (recipe_id, resource_id, quantity_required) 
                     VALUES ($1, $2, $3) 
                     RETURNING id, recipe_id, resource_id, quantity_required`,
                    [id, resource_id, quantity_required]
                )

                return reply.status(201).send({
                    message: 'Resource added to recipe successfully',
                    recipe_resource: result.rows[0]
                })

            } catch (err: any) {
                // Catch unique constraint violation (e.g., resource_id already mapped to this recipe_id)
                if (err.code === '23505') {
                    return reply.status(400).send({
                        error: 'Bad Request',
                        message: 'This resource is already added to the specified recipe'
                    })
                }

                fastify.log.error(err)
                return reply.status(500).send({
                    error: 'Internal Server Error',
                    message: 'Failed to add resource to recipe'
                })
            }
        }
    })

    /**
     * PUT /recipes/:id - Update an existing recipe
     * Only accessible by 'admin' or 'manager' roles.
     */
    fastify.put('/:id', {
        preHandler: [fastify.authenticate, authorizeRole(['admin', 'manager'])],
        schema: {
            params: RecipeIdParamSchema,
            body: UpdateRecipeSchema
        },
        handler: async (request, reply) => {
            const { id } = request.params
            const { name, version, batch_size_liters, resources } = request.body

            let client
            try {
                client = await fastify.db.connect()
                await client.query('BEGIN')

                // Update recipe core fields
                const updates: string[] = []
                const values: any[] = []
                let paramIdx = 1

                if (name !== undefined) {
                    updates.push(`name = $${paramIdx++}`)
                    values.push(name)
                }
                if (version !== undefined) {
                    updates.push(`version = $${paramIdx++}`)
                    values.push(version)
                }
                if (batch_size_liters !== undefined) {
                    updates.push(`batch_size_liters = $${paramIdx++}`)
                    values.push(batch_size_liters)
                }

                if (updates.length > 0) {
                    updates.push(`updated_at = CURRENT_TIMESTAMP`)
                    values.push(id)
                    const updateQuery = `UPDATE recipes SET ${updates.join(', ')} WHERE id = $${paramIdx}`
                    await client.query(updateQuery, values)
                }

                // Update resources if provided
                if (resources !== undefined) {
                    // First, delete current resources for this recipe
                    await client.query('DELETE FROM recipe_resources WHERE recipe_id = $1', [id])

                    // Insert the new ones
                    for (const res of resources) {
                        await client.query(
                            `INSERT INTO recipe_resources (recipe_id, resource_id, quantity_required) 
                             VALUES ($1, $2, $3)`,
                            [id, res.resource_id, res.quantity_required]
                        )
                    }
                }

                const user = request.user as any
                await client.query(
                    `INSERT INTO audit_logs (user_id, action, entity_type, entity_id)
                     VALUES ($1, 'recipe_updated', 'recipe', $2)`,
                    [user.id, id]
                )

                await client.query('COMMIT')
                
                return reply.send({
                    message: 'Recipe updated successfully'
                })
            } catch (err: any) {
                if (client) await client.query('ROLLBACK')
                if (err.code === '23505') {
                    return reply.status(400).send({
                        error: 'Bad Request',
                        message: 'A duplicate entry exists (e.g., duplicated resource in recipe)'
                    })
                }
                fastify.log.error(err)
                return reply.status(500).send({
                    error: 'Internal Server Error',
                    message: 'Failed to update recipe'
                })
            } finally {
                if (client) client.release()
            }
        }
    })

    /**
     * DELETE /recipes/:id - Delete a recipe
     * Only accessible by 'admin' or 'manager' roles.
     */
    fastify.delete('/:id', {
        preHandler: [fastify.authenticate, authorizeRole(['admin', 'manager'])],
        schema: {
            params: RecipeIdParamSchema
        },
        handler: async (request, reply) => {
            const { id } = request.params
            let client
            try {
                client = await fastify.db.connect()
                await client.query('BEGIN')

                // Get the color_id before deleting
                const recipeResult = await client.query('SELECT color_id FROM recipes WHERE id = $1', [id])
                if (recipeResult.rows.length === 0) {
                    await client.query('ROLLBACK')
                    return reply.status(404).send({
                        error: 'Not Found',
                        message: 'Recipe not found'
                    })
                }
                const colorId = recipeResult.rows[0].color_id

                // Find other recipes for this color and wipe out associated data
                const otherRecipes = await client.query('SELECT id FROM recipes WHERE color_id = $1', [colorId])
                for (const row of otherRecipes.rows) {
                    const recipeId = row.id
                    
                    // Find and delete all production runs using this recipe
                    const runsResult = await client.query('SELECT id FROM production_runs WHERE recipe_id = $1', [recipeId])
                    for (const runRow of runsResult.rows) {
                        const runId = runRow.id
                        // Clean up child dependencies of the production run
                        await client.query('DELETE FROM production_resource_actuals WHERE production_run_id = $1', [runId])
                        await client.query("DELETE FROM finished_stock_transactions WHERE reference_id = $1 AND transaction_type = 'production_entry'", [runId])
                        await client.query("DELETE FROM resource_stock_transactions WHERE reference_id = $1 AND transaction_type = 'production_usage'", [runId])
                        // Delete the run itself
                        await client.query('DELETE FROM production_runs WHERE id = $1', [runId])
                    }

                    // Delete the recipe resources mapping
                    await client.query('DELETE FROM recipe_resources WHERE recipe_id = $1', [recipeId])
                }

                // Delete all finished stock and general transactions for this color
                await client.query('DELETE FROM finished_stock_transactions WHERE color_id = $1', [colorId])
                await client.query('DELETE FROM finished_stock WHERE color_id = $1', [colorId])
                
                // Delete all recipes for this color
                await client.query('DELETE FROM recipes WHERE color_id = $1', [colorId])

                // Delete the color itself
                await client.query('DELETE FROM colors WHERE id = $1', [colorId])

                const user = request.user as any
                await client.query(
                    `INSERT INTO audit_logs (user_id, action, entity_type, entity_id)
                      VALUES ($1, 'recipe_deleted_cascade_color', 'recipe', $2)`,
                    [user.id, id]
                )

                await client.query('COMMIT')
                return reply.send({
                    message: 'Recipe and its associated color deleted successfully'
                })
            } catch (err: any) {
                if (client) await client.query('ROLLBACK')
                if (err.code === '23503') {
                    return reply.status(400).send({
                        error: 'Bad Request',
                        message: `Cannot delete: the recipe or color is locked by existing data. Detail: ${err.detail || 'None available'}`
                    })
                }
                fastify.log.error(err)
                return reply.status(500).send({
                    error: 'Internal Server Error',
                    message: 'Failed to delete recipe and color'
                })
            } finally {
                if (client) client.release()
            }
        }
    })
}
