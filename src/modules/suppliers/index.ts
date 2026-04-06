/**
 * Suppliers Module
 * Handles operations related to raw material suppliers.
 */

import { FastifyInstance } from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'
import { authorizeRole } from '../../utils/authorizeRole'

export default async function (fastifyRaw: FastifyInstance) {
    const fastify = fastifyRaw.withTypeProvider<TypeBoxTypeProvider>()

    const POCSchema = Type.Object({
        name: Type.String(),
        email: Type.Optional(Type.String()),
        phone: Type.Optional(Type.String()),
        role: Type.Optional(Type.String())
    })

    const CreateSupplierSchema = Type.Object({
        name: Type.String(),
        pocs: Type.Optional(Type.Array(POCSchema)),
        gst_number: Type.Optional(Type.String()),
        regulatory_info: Type.Optional(Type.String()),
        address: Type.Optional(Type.String()),
        website: Type.Optional(Type.String()),
        notes: Type.Optional(Type.String())
    })

    const UpdateSupplierSchema = Type.Object({
        name: Type.Optional(Type.String()),
        pocs: Type.Optional(Type.Array(POCSchema)),
        gst_number: Type.Optional(Type.String()),
        regulatory_info: Type.Optional(Type.String()),
        address: Type.Optional(Type.String()),
        website: Type.Optional(Type.String()),
        notes: Type.Optional(Type.String())
    })

    const SupplierIdParamSchema = Type.Object({
        id: Type.Integer()
    })

    /**
     * GET /suppliers - Retrieve all suppliers
     */
    fastify.get('/', {
        preHandler: [fastify.authenticate],
        schema: {
            querystring: Type.Object({
                componentSearch: Type.Optional(Type.String())
            })
        },
        handler: async (request, reply) => {
            const { componentSearch } = request.query
            try {
                let query = `
                    SELECT s.*, 
                           (SELECT json_agg(resources) FROM (
                               SELECT r.id, r.name, r.color, r.unit 
                               FROM resources r 
                               WHERE r.supplier_id = s.id
                           ) resources) as catalog
                    FROM suppliers s
                `
                let params: any[] = []

                if (componentSearch) {
                    query = `
                        SELECT s.*, 
                               (SELECT json_agg(resources) FROM (
                                   SELECT r.id, r.name, r.color, r.unit 
                                   FROM resources r 
                                   WHERE r.supplier_id = s.id
                               ) resources) as catalog,
                               (SELECT COUNT(*) FROM resources r WHERE r.supplier_id = s.id AND r.name ILIKE $1) as match_count
                        FROM suppliers s
                        ORDER BY match_count DESC, s.name ASC
                    `
                    params = [`%${componentSearch}%`]
                } else {
                    query += ' ORDER BY s.name ASC'
                }

                const result = await fastify.db.query(query, params)
                return reply.send(result.rows)
            } catch (err) {
                fastify.log.error(err)
                return reply.status(500).send({
                    error: 'Internal Server Error',
                    message: 'Failed to retrieve suppliers'
                })
            }
        }
    })

    /**
     * GET /suppliers/:id - Retrieve a specific supplier by ID
     */
    fastify.get('/:id', {
        preHandler: [fastify.authenticate],
        schema: {
            params: SupplierIdParamSchema
        },
        handler: async (request, reply) => {
            const { id } = request.params
            try {
                const result = await fastify.db.query(
                    `SELECT s.*, 
                            (SELECT json_agg(resources) FROM (
                                SELECT r.id, r.name, r.color, r.unit 
                                FROM resources r 
                                WHERE r.supplier_id = s.id
                            ) resources) as catalog
                     FROM suppliers s WHERE s.id = $1`,
                    [id]
                )
                if (result.rows.length === 0) {
                    return reply.status(404).send({
                        error: 'Not Found',
                        message: 'Supplier not found'
                    })
                }
                return reply.send(result.rows[0])
            } catch (err) {
                fastify.log.error(err)
                return reply.status(500).send({
                    error: 'Internal Server Error',
                    message: 'Failed to retrieve supplier'
                })
            }
        }
    })

    /**
     * POST /suppliers - Create a new supplier
     */
    fastify.post('/', {
        preHandler: [fastify.authenticate, authorizeRole(['admin', 'manager'])],
        schema: {
            body: CreateSupplierSchema
        },
        handler: async (request, reply) => {
            const { name, pocs, gst_number, regulatory_info, address, website, notes } = request.body
            try {
                const insertResult = await fastify.db.query(
                    `INSERT INTO suppliers (name, pocs, gst_number, regulatory_info, address, website, notes) 
                     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
                    [name, JSON.stringify(pocs || []), gst_number, regulatory_info, address, website, notes]
                )
                return reply.status(201).send(insertResult.rows[0])
            } catch (err: any) {
                if (err.code === '23505') {
                    return reply.status(400).send({ error: 'Bad Request', message: 'Supplier name already exists' })
                }
                fastify.log.error(err)
                return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to create supplier' })
            }
        }
    })

    /**
     * PUT /suppliers/:id - Update a supplier
     */
    fastify.put('/:id', {
        preHandler: [fastify.authenticate, authorizeRole(['admin', 'manager'])],
        schema: {
            params: SupplierIdParamSchema,
            body: UpdateSupplierSchema
        },
        handler: async (request, reply) => {
            const { id } = request.params
            const updates = request.body as any
            
            const fields = Object.keys(updates).filter(k => updates[k] !== undefined)
            if (fields.length === 0) {
                const existing = await fastify.db.query('SELECT * FROM suppliers WHERE id = $1', [id])
                return reply.send(existing.rows[0])
            }

            const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(', ')
            const values = fields.map(f => f === 'pocs' ? JSON.stringify(updates[f]) : updates[f])
            values.push(id)

            try {
                const result = await fastify.db.query(
                    `UPDATE suppliers SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length} RETURNING *`,
                    values
                )
                if (result.rows.length === 0) return reply.status(404).send({ error: 'Not Found', message: 'Supplier not found' })
                return reply.send(result.rows[0])
            } catch (err) {
                fastify.log.error(err)
                return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to update supplier' })
            }
        }
    })

    /**
     * DELETE /suppliers/:id - Delete a supplier
     */
    fastify.delete('/:id', {
        preHandler: [fastify.authenticate, authorizeRole(['admin', 'manager'])],
        schema: {
            params: SupplierIdParamSchema
        },
        handler: async (request, reply) => {
            const { id } = request.params
            try {
                const result = await fastify.db.query('DELETE FROM suppliers WHERE id = $1 RETURNING id', [id])
                if (result.rows.length === 0) return reply.status(404).send({ error: 'Not Found', message: 'Supplier not found' })
                return reply.send({ message: 'Supplier deleted successfully' })
            } catch (err: any) {
                if (err.code === '23503') return reply.status(400).send({ error: 'Bad Request', message: 'Cannot delete: supplier is linked to resources' })
                fastify.log.error(err)
                return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to delete supplier' })
            }
        }
    })
}
