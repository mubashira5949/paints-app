/**
 * Colors Module
 * Handles operations related to paint colors.
 */

import { FastifyInstance } from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'
import { authorizeRole } from '../../utils/authorizeRole'

export default async function (fastifyRaw: FastifyInstance) {
    const fastify = fastifyRaw.withTypeProvider<TypeBoxTypeProvider>()

    const CreateColorSchema = Type.Object({
        name: Type.String(),
        color_code: Type.Optional(Type.String()),
        description: Type.Optional(Type.String()),
        hsn_code: Type.Optional(Type.String()),
        business_code: Type.Optional(Type.String()),
        tags: Type.Optional(Type.Array(Type.String())),
        min_threshold_kg: Type.Optional(Type.Number({ default: 0 })),
        type_ids: Type.Optional(Type.Array(Type.Integer())),
        series_ids: Type.Optional(Type.Array(Type.Integer())),
        grade_ids: Type.Optional(Type.Array(Type.Integer()))
    })

    const UpdateColorSchema = Type.Object({
        name: Type.Optional(Type.String()),
        color_code: Type.Optional(Type.String()),
        description: Type.Optional(Type.String()),
        hsn_code: Type.Optional(Type.String()),
        business_code: Type.Optional(Type.String()),
        tags: Type.Optional(Type.Array(Type.String())),
        min_threshold_kg: Type.Optional(Type.Number()),
        type_ids: Type.Optional(Type.Array(Type.Integer())),
        series_ids: Type.Optional(Type.Array(Type.Integer())),
        grade_ids: Type.Optional(Type.Array(Type.Integer()))
    })

    const ColorIdParamSchema = Type.Object({
        id: Type.Integer()
    })

    /**
     * GET /colors - Retrieve all colors.
     * Accessible to all authenticated users.
     */
    fastify.get('/', {
        preHandler: [fastify.authenticate],
        handler: async (request, reply) => {
            try {
                const result = await fastify.db.query(
                    `SELECT 
                        c.id, c.name, c.color_code, c.business_code, c.hsn_code, c.tags, c.description, c.min_threshold_kg, c.created_at, c.updated_at,
                        COALESCE(json_agg(DISTINCT pt.name) FILTER (WHERE pt.name IS NOT NULL), '[]') as product_types,
                        COALESCE(json_agg(DISTINCT psc.name) FILTER (WHERE psc.name IS NOT NULL), '[]') as product_series,
                        COALESCE(json_agg(DISTINCT ig.name) FILTER (WHERE ig.name IS NOT NULL), '[]') as ink_grades,
                        COALESCE(json_agg(DISTINCT pt.id) FILTER (WHERE pt.id IS NOT NULL), '[]') as type_ids,
                        COALESCE(json_agg(DISTINCT psc.id) FILTER (WHERE psc.id IS NOT NULL), '[]') as series_ids,
                        COALESCE(json_agg(DISTINCT ig.id) FILTER (WHERE ig.id IS NOT NULL), '[]') as grade_ids
                     FROM colors c
                     LEFT JOIN color_product_types cpt ON c.id = cpt.color_id
                     LEFT JOIN product_types pt ON cpt.type_id = pt.id
                     LEFT JOIN color_product_series cps ON c.id = cps.color_id
                     LEFT JOIN product_series_categories psc ON cps.series_id = psc.id
                     LEFT JOIN color_ink_grades cig ON c.id = cig.color_id
                     LEFT JOIN ink_grades ig ON cig.grade_id = ig.id
                     GROUP BY c.id ORDER BY c.id DESC`
                )

                return reply.send(result.rows)
            } catch (err) {
                fastify.log.error(err)
                return reply.status(500).send({
                    error: 'Internal Server Error',
                    message: 'Failed to retrieve colors'
                })
            }
        }
    })

    /**
     * POST /colors - Create a new color.
     * Only accessible by users with 'admin' or 'manager' roles.
     */
    fastify.post('/', {
        preHandler: [fastify.authenticate, authorizeRole(['admin', 'manager'])],
        schema: {
            body: CreateColorSchema
        },
        handler: async (request, reply) => {
            const { name, color_code, description, hsn_code, business_code, tags, min_threshold_kg, type_ids, series_ids, grade_ids } = request.body
            const client = await fastify.db.connect()

            try {
                await client.query('BEGIN')

                // Create the color entry (removed old relational columns)
                const insertResult = await client.query(
                    `INSERT INTO colors (name, color_code, description, hsn_code, business_code, tags, min_threshold_kg)
                     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
                    [name, color_code, description, hsn_code ?? null, business_code ?? null, JSON.stringify(tags ?? []), min_threshold_kg ?? 0]
                )
                const newColor = insertResult.rows[0]

                // Insert into junction tables
                if (type_ids && type_ids.length > 0) {
                    for (const tid of type_ids) {
                        await client.query('INSERT INTO color_product_types (color_id, type_id) VALUES ($1, $2)', [newColor.id, tid])
                    }
                }
                if (series_ids && series_ids.length > 0) {
                    for (const sid of series_ids) {
                        await client.query('INSERT INTO color_product_series (color_id, series_id) VALUES ($1, $2)', [newColor.id, sid])
                    }
                }
                if (grade_ids && grade_ids.length > 0) {
                    for (const gid of grade_ids) {
                        await client.query('INSERT INTO color_ink_grades (color_id, grade_id) VALUES ($1, $2)', [newColor.id, gid])
                    }
                }

                // Log the creation
                const user = request.user as any
                await client.query(
                    `INSERT INTO audit_logs (user_id, action, entity_type, entity_id)
                     VALUES ($1, 'color_created', 'color', $2)`,
                    [user.id, newColor.id]
                )

                await client.query('COMMIT')

                const fetchResult = await client.query(
                    `SELECT 
                        c.id, c.name, c.color_code, c.business_code, c.hsn_code, c.tags, c.description, c.min_threshold_kg, c.created_at, c.updated_at,
                        COALESCE(json_agg(DISTINCT pt.name) FILTER (WHERE pt.name IS NOT NULL), '[]') as product_types,
                        COALESCE(json_agg(DISTINCT psc.name) FILTER (WHERE psc.name IS NOT NULL), '[]') as product_series,
                        COALESCE(json_agg(DISTINCT ig.name) FILTER (WHERE ig.name IS NOT NULL), '[]') as ink_grades,
                        COALESCE(json_agg(DISTINCT pt.id) FILTER (WHERE pt.id IS NOT NULL), '[]') as type_ids,
                        COALESCE(json_agg(DISTINCT psc.id) FILTER (WHERE psc.id IS NOT NULL), '[]') as series_ids,
                        COALESCE(json_agg(DISTINCT ig.id) FILTER (WHERE ig.id IS NOT NULL), '[]') as grade_ids
                     FROM colors c
                     LEFT JOIN color_product_types cpt ON c.id = cpt.color_id
                     LEFT JOIN product_types pt ON cpt.type_id = pt.id
                     LEFT JOIN color_product_series cps ON c.id = cps.color_id
                     LEFT JOIN product_series_categories psc ON cps.series_id = psc.id
                     LEFT JOIN color_ink_grades cig ON c.id = cig.color_id
                     LEFT JOIN ink_grades ig ON cig.grade_id = ig.id
                     WHERE c.id = $1
                     GROUP BY c.id`,
                    [newColor.id]
                )

                return reply.status(201).send({
                    message: 'Color created successfully',
                    color: fetchResult.rows[0]
                })
            } catch (err: any) {
                await client.query('ROLLBACK')
                if (err.code === '23505') { // Unique violation Postgres
                    return reply.status(400).send({
                        error: 'Bad Request',
                        message: 'A color with this name already exists'
                    })
                }
                fastify.log.error(err)
                return reply.status(500).send({
                    error: 'Internal Server Error',
                    message: 'Failed to create color'
                })
            } finally {
                client.release()
            }
        }
    })

    /**
     * PUT /colors/:id - Update an existing color.
     * Only accessible by 'admin' or 'manager' roles.
     */
    fastify.put('/:id', {
        preHandler: [fastify.authenticate, authorizeRole(['admin', 'manager'])],
        schema: {
            params: ColorIdParamSchema,
            body: UpdateColorSchema
        },
        handler: async (request, reply) => {
            const { id } = request.params
            const { name, color_code, description, hsn_code, business_code, tags, min_threshold_kg, type_ids, series_ids, grade_ids } = request.body
            const client = await fastify.db.connect()

            try {
                await client.query('BEGIN')

                const existingResult = await client.query('SELECT id FROM colors WHERE id = $1', [id])
                if (existingResult.rows.length === 0) {
                    await client.query('ROLLBACK')
                    return reply.status(404).send({ error: 'Not Found', message: 'Color not found' })
                }

                const updates: string[] = []
                const values: any[] = []
                let paramIdx = 1

                if (name !== undefined) {
                    updates.push(`name = $${paramIdx++}`)
                    values.push(name)
                }
                if (color_code !== undefined) {
                    updates.push(`color_code = $${paramIdx++}`)
                    values.push(color_code)
                }
                if (description !== undefined) {
                    updates.push(`description = $${paramIdx++}`)
                    values.push(description)
                }
                if (hsn_code !== undefined) {
                    updates.push(`hsn_code = $${paramIdx++}`)
                    values.push(hsn_code)
                }
                if (business_code !== undefined) {
                    updates.push(`business_code = $${paramIdx++}`)
                    values.push(business_code)
                }
                if (tags !== undefined) {
                    updates.push(`tags = $${paramIdx++}`)
                    values.push(JSON.stringify(tags))
                }
                if (min_threshold_kg !== undefined) {
                    updates.push(`min_threshold_kg = $${paramIdx++}`)
                    values.push(min_threshold_kg)
                }

                if (updates.length > 0) {
                    updates.push(`updated_at = CURRENT_TIMESTAMP`)
                    values.push(id)
                    const updateQuery = `UPDATE colors SET ${updates.join(', ')} WHERE id = $${paramIdx}`
                    await client.query(updateQuery, values)
                }

                // Sync Function tables
                if (type_ids !== undefined) {
                    await client.query('DELETE FROM color_product_types WHERE color_id = $1', [id])
                    for (const tid of type_ids) {
                        await client.query('INSERT INTO color_product_types (color_id, type_id) VALUES ($1, $2)', [id, tid])
                    }
                }
                if (series_ids !== undefined) {
                    await client.query('DELETE FROM color_product_series WHERE color_id = $1', [id])
                    for (const sid of series_ids) {
                        await client.query('INSERT INTO color_product_series (color_id, series_id) VALUES ($1, $2)', [id, sid])
                    }
                }
                if (grade_ids !== undefined) {
                    await client.query('DELETE FROM color_ink_grades WHERE color_id = $1', [id])
                    for (const gid of grade_ids) {
                        await client.query('INSERT INTO color_ink_grades (color_id, grade_id) VALUES ($1, $2)', [id, gid])
                    }
                }

                await client.query('COMMIT')

                const finalResult = await fastify.db.query(
                    `SELECT 
                        c.id, c.name, c.color_code, c.business_code, c.hsn_code, c.tags, c.description, c.min_threshold_kg, c.created_at, c.updated_at,
                        COALESCE(json_agg(DISTINCT pt.name) FILTER (WHERE pt.name IS NOT NULL), '[]') as product_types,
                        COALESCE(json_agg(DISTINCT psc.name) FILTER (WHERE psc.name IS NOT NULL), '[]') as product_series,
                        COALESCE(json_agg(DISTINCT ig.name) FILTER (WHERE ig.name IS NOT NULL), '[]') as ink_grades,
                        COALESCE(json_agg(DISTINCT pt.id) FILTER (WHERE pt.id IS NOT NULL), '[]') as type_ids,
                        COALESCE(json_agg(DISTINCT psc.id) FILTER (WHERE psc.id IS NOT NULL), '[]') as series_ids,
                        COALESCE(json_agg(DISTINCT ig.id) FILTER (WHERE ig.id IS NOT NULL), '[]') as grade_ids
                     FROM colors c
                     LEFT JOIN color_product_types cpt ON c.id = cpt.color_id
                     LEFT JOIN product_types pt ON cpt.type_id = pt.id
                     LEFT JOIN color_product_series cps ON c.id = cps.color_id
                     LEFT JOIN product_series_categories psc ON cps.series_id = psc.id
                     LEFT JOIN color_ink_grades cig ON c.id = cig.color_id
                     LEFT JOIN ink_grades ig ON cig.grade_id = ig.id
                     WHERE c.id = $1
                     GROUP BY c.id`,
                    [id]
                )
                
                const user = request.user as any
                await fastify.db.query(
                    `INSERT INTO audit_logs (user_id, action, entity_type, entity_id)
                     VALUES ($1, 'color_updated', 'color', $2)`,
                    [user.id, id]
                )

                return reply.send({
                    message: 'Color updated successfully',
                    color: finalResult.rows[0]
                })

            } catch (err: any) {
                await client.query('ROLLBACK')
                if (err.code === '23505') {
                    return reply.status(400).send({
                        error: 'Bad Request',
                        message: 'A color with this name already exists'
                    })
                }
                fastify.log.error(err)
                return reply.status(500).send({
                    error: 'Internal Server Error',
                    message: 'Failed to update color'
                })
            } finally {
                client.release()
            }
        }
    })

    /**
     * DELETE /colors/:id - Delete a color
     * Only accessible by 'admin' or 'manager' roles.
     */
    fastify.delete('/:id', {
        preHandler: [fastify.authenticate, authorizeRole(['admin', 'manager'])],
        schema: {
            params: ColorIdParamSchema
        },
        handler: async (request, reply) => {
            const { id } = request.params
            let client
            try {
                client = await fastify.db.connect()
                await client.query('BEGIN')

                // Find all formulas for this color and wipe out associated data
                const formulasResult = await client.query('SELECT id FROM formulas WHERE color_id = $1', [id])
                for (const row of formulasResult.rows) {
                    const formulaId = row.id
                    
                    // Find and delete all production runs using this formula
                    const runsResult = await client.query('SELECT id FROM production_runs WHERE formula_id = $1', [formulaId])
                    for (const runRow of runsResult.rows) {
                        const runId = runRow.id
                        // Clean up child dependencies of the production run
                        await client.query('DELETE FROM production_resource_actuals WHERE production_run_id = $1', [runId])
                        await client.query("DELETE FROM finished_stock_transactions WHERE reference_id = $1 AND transaction_type = 'production_entry'", [runId])
                        await client.query("DELETE FROM resource_stock_transactions WHERE reference_id = $1 AND transaction_type = 'production_usage'", [runId])
                        // Delete the run itself
                        await client.query('DELETE FROM production_runs WHERE id = $1', [runId])
                    }

                    // Delete the formula resources mapping
                    await client.query('DELETE FROM formula_resources WHERE formula_id = $1', [formulaId])
                }

                // Delete all finished stock and general transactions for this color
                await client.query('DELETE FROM finished_stock_transactions WHERE color_id = $1', [id])
                await client.query('DELETE FROM finished_stock WHERE color_id = $1', [id])
                
                // Delete the formulas
                await client.query('DELETE FROM formulas WHERE color_id = $1', [id])

                const deleteResult = await client.query(
                    'DELETE FROM colors WHERE id = $1 RETURNING id',
                    [id]
                )

                if (deleteResult.rows.length === 0) {
                    await client.query('ROLLBACK')
                    return reply.status(404).send({
                        error: 'Not Found',
                        message: 'Color not found'
                    })
                }

                const user = request.user as any
                await client.query(
                    `INSERT INTO audit_logs (user_id, action, entity_type, entity_id)
                      VALUES ($1, 'color_deleted', 'color', $2)`,
                    [user.id, id]
                )

                await client.query('COMMIT')
                return reply.send({
                    message: 'Color and associated formulas deleted successfully'
                })
            } catch (err: any) {
                if (client) await client.query('ROLLBACK')
                if (err.code === '23503') {
                    return reply.status(400).send({
                        error: 'Bad Request',
                        message: `Cannot delete color: it is locked by existing data. Detail: ${err.detail || 'None available'}`
                    })
                }
                fastify.log.error(err)
                return reply.status(500).send({
                    error: 'Internal Server Error',
                    message: 'Failed to delete color'
                })
            } finally {
                if (client) client.release()
            }
        }
    })
}
