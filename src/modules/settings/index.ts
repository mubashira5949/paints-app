/**
 * Settings Module
 * Handles system configuration such as Dynamic Product Types.
 */

import { FastifyInstance } from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'
import { authorizeRole } from '../../utils/authorizeRole'

export default async function (fastifyRaw: FastifyInstance) {
    const fastify = fastifyRaw.withTypeProvider<TypeBoxTypeProvider>()

    const ProductTypeSchema = Type.Object({
        id: Type.Integer(),
        name: Type.String(),
        created_at: Type.String()
    })

    const CreateProductTypeSchema = Type.Object({
        name: Type.String({ minLength: 1, maxLength: 50 })
    })

    const CategorySchema = Type.Object({
        id: Type.Integer(),
        name: Type.String(),
        created_at: Type.String()
    })

    const GradeSchema = Type.Object({
        id: Type.Integer(),
        name: Type.String(),
        created_at: Type.String()
    })

    /**
     * GET /settings/product-types - List all available product types.
     */
    fastify.get('/product-types', {
        preHandler: [fastify.authenticate],
        schema: {
            response: {
                200: Type.Array(ProductTypeSchema),
                400: Type.Object({ error: Type.String(), message: Type.String() }),
                500: Type.Object({ error: Type.String(), message: Type.String() })
            }
        },
        handler: async (request, reply) => {
            try {
                const result = await fastify.db.query(
                    'SELECT id, name, created_at FROM product_types ORDER BY name ASC'
                )
                return reply.send(result.rows)
            } catch (err) {
                fastify.log.error(err)
                return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to fetch product types' })
            }
        }
    })

    /**
     * POST /settings/product-types - Add a new product type.
     * Restricted to admin/manager.
     */
    fastify.post('/product-types', {
        preHandler: [fastify.authenticate, authorizeRole(['admin', 'manager'])],
        schema: {
            body: CreateProductTypeSchema,
            response: {
                201: ProductTypeSchema,
                400: Type.Object({ error: Type.String(), message: Type.String() }),
                500: Type.Object({ error: Type.String(), message: Type.String() })
            }
        },
        handler: async (request, reply) => {
            const { name } = request.body
            try {
                const result = await fastify.db.query(
                    'INSERT INTO product_types (name) VALUES ($1) RETURNING id, name, created_at',
                    [name]
                )
                return reply.status(201).send(result.rows[0])
            } catch (err: any) {
                if (err.code === '23505') {
                    return reply.status(400).send({ error: 'Bad Request', message: 'Product type already exists' })
                }
                fastify.log.error(err)
                return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to create product type' })
            }
        }
    })

    /**
     * DELETE /settings/product-types/:id - Remove a product type.
     * Restricted to admin/manager.
     */
    fastify.delete('/product-types/:id', {
        preHandler: [fastify.authenticate, authorizeRole(['admin', 'manager'])],
        schema: {
            params: Type.Object({ id: Type.Integer() }),
            response: {
                200: Type.Object({ message: Type.String() }),
                400: Type.Object({ error: Type.String(), message: Type.String() }),
                404: Type.Object({ error: Type.String(), message: Type.String() }),
                500: Type.Object({ error: Type.String(), message: Type.String() })
            }
        },
        handler: async (request, reply) => {
            const { id } = request.params
            try {
                // First check if any color is using this type via junction table
                const usageRes = await fastify.db.query(
                    'SELECT 1 FROM color_product_types WHERE type_id = $1 LIMIT 1',
                    [id]
                )

                if (usageRes.rows.length > 0) {
                    return reply.status(400).send({ 
                        error: 'Conflict', 
                        message: 'Cannot delete product type because it is being used by existing colors' 
                    })
                }

                const delRes = await fastify.db.query('DELETE FROM product_types WHERE id = $1 RETURNING id', [id])
                if (delRes.rows.length === 0) {
                    return reply.status(404).send({ error: 'Not Found', message: 'Product type not found' })
                }
                return reply.send({ message: 'Product type deleted' })
            } catch (err) {
                fastify.log.error(err)
                return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to delete product type' })
            }
        }
    })

    /**
     * GET /settings/product-series - List all series categories.
     */
    fastify.get('/product-series', {
        preHandler: [fastify.authenticate],
        schema: {
            response: {
                200: Type.Array(CategorySchema),
                500: Type.Object({ error: Type.String(), message: Type.String() })
            }
        },
        handler: async (request, reply) => {
            try {
                const result = await fastify.db.query('SELECT id, name, created_at FROM product_series_categories ORDER BY name ASC')
                return reply.send(result.rows)
            } catch (err) {
                fastify.log.error(err)
                return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to fetch series categories' })
            }
        }
    })

    /**
     * GET /settings/ink-grades - List all ink grades.
     */
    fastify.get('/ink-grades', {
        preHandler: [fastify.authenticate],
        schema: {
            response: {
                200: Type.Array(GradeSchema),
                500: Type.Object({ error: Type.String(), message: Type.String() })
            }
        },
        handler: async (request, reply) => {
            try {
                const result = await fastify.db.query('SELECT id, name, created_at FROM ink_grades ORDER BY name ASC')
                return reply.send(result.rows)
            } catch (err) {
                fastify.log.error(err)
                return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to fetch ink grades' })
            }
        }
    })
}
