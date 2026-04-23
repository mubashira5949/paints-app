/**
 * Inventory API Module
 * Exposes endpoints for the Inventory page as requested.
 */

import { FastifyInstance } from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'

export default async function (fastifyRaw: FastifyInstance) {
    const fastify = fastifyRaw.withTypeProvider<TypeBoxTypeProvider>()

    /**
     * GET /api/inventory/summary
     * Returns a summary for the inventory cards.
     */
    fastify.get('/summary', {
        schema: {
            response: {
                200: Type.Object({
                    totalMass: Type.Number(),
                    packagedUnits: Type.Number(),
                    lowStockColors: Type.Number()
                }),
                500: Type.Object({
                    error: Type.String(),
                    message: Type.String()
                })
            },
            querystring: Type.Object({
                threshold: Type.Optional(Type.Number())
            }),
            security: [{ bearerAuth: [] }]
        },
        preHandler: [fastify.authenticate],
        handler: async (request, reply): Promise<any> => {
            try {
                // Total Volume and Packaged Units
                const totalsQuery = `
                    SELECT 
                        COALESCE(SUM(quantity_units * pack_size_kg), 0)::float as "totalMass",
                        COALESCE(SUM(quantity_units), 0)::int as "packagedUnits"
                    FROM finished_stock
                `;
                const totalsResult = await fastify.db.query(totalsQuery);
                const totals = totalsResult.rows[0];

                const threshold = (request.query as any)?.threshold;
                // Low Stock Colors Count
                let lowStockQuery;
                let paramVals: any[] = [];
                if (threshold !== undefined) {
                    lowStockQuery = `
                        SELECT COUNT(*) as "lowStockColors"
                        FROM (
                            SELECT c.id
                            FROM colors c
                            LEFT JOIN finished_stock fs ON c.id = fs.color_id
                            GROUP BY c.id
                            HAVING COALESCE(SUM(fs.quantity_units * fs.pack_size_kg), 0) < $1::numeric
                        ) AS low_stock_colors
                    `;
                    paramVals = [threshold];
                } else {
                    lowStockQuery = `
                        SELECT COUNT(*) as "lowStockColors"
                        FROM (
                            SELECT c.id
                            FROM colors c
                            LEFT JOIN finished_stock fs ON c.id = fs.color_id
                            GROUP BY c.id, c.min_threshold_kg
                            HAVING COALESCE(SUM(fs.quantity_units * fs.pack_size_kg), 0) < c.min_threshold_kg
                        ) AS low_stock_colors
                    `;
                }
                
                const lowStockResult = await fastify.db.query(lowStockQuery, paramVals);
                const lowStockColors = parseInt(lowStockResult.rows[0].lowStockColors);

                return reply.status(200).send({
                    totalMass: Number(totals.totalMass),
                    packagedUnits: Number(totals.packagedUnits),
                    lowStockColors: Number(lowStockColors)
                });
            } catch (err) {
                fastify.log.error(err);
                return reply.status(500).send({
                    error: 'Internal Server Error',
                    message: 'Failed to fetch inventory summary'
                });
            }
        }
    });

    /**
     * GET /api/inventory
     * Returns inventory table data with supports for filters.
     */
    fastify.get('/', {
        schema: {
            querystring: Type.Object({
                search: Type.Optional(Type.String()),
                status: Type.Optional(Type.String()),
                packSize: Type.Optional(Type.String()),
                series: Type.Optional(Type.String()),
                productType: Type.Optional(Type.String()),
                threshold: Type.Optional(Type.Number())
            }),
            security: [{ bearerAuth: [] }],
            response: {
                200: Type.Array(Type.Object({
                    id: Type.Integer(),
                    color: Type.String(),
                    color_code: Type.Union([Type.String(), Type.Null()]),
                    business_code: Type.Union([Type.String(), Type.Null()]),
                    product_series: Type.Array(Type.String()),
                    product_types: Type.Array(Type.String()),
                    ink_grades: Type.Array(Type.String()),
                    series_ids: Type.Array(Type.Integer()),
                    type_ids: Type.Array(Type.Integer()),
                    grade_ids: Type.Array(Type.Integer()),
                    hsn_code: Type.Union([Type.String(), Type.Null()]),
                    tags: Type.Union([Type.Array(Type.String()), Type.Null()]),
                    description: Type.Union([Type.String(), Type.Null()]),
                    min_threshold_kg: Type.Number(),
                    packDistribution: Type.Array(Type.Object({
                        size: Type.String(),
                        units: Type.Number()
                    })),
                    units: Type.Integer(),
                    mass: Type.Number(),
                    status: Type.String()
                })),
                500: Type.Object({
                    error: Type.String(),
                    message: Type.String()
                })
            }
        },
        preHandler: [fastify.authenticate],
        handler: async (request, reply): Promise<any> => {
            let query = '';
            let params: any[] = [];
            try {
                const { search, status, packSize, series, productType, threshold } = request.query as any;

                query = `
                    WITH color_stock AS (
                        SELECT 
                            c.id,
                            c.name as color,
                            c.color_code,
                            c.business_code,
                            c.hsn_code,
                            c.description,
                            c.tags,
                            c.min_threshold_kg,
                            ${threshold !== undefined ? `${threshold}::numeric` : 'c.min_threshold_kg'} as active_threshold,
                            COALESCE(json_agg(DISTINCT pt.name) FILTER (WHERE pt.name IS NOT NULL), '[]'::json) as product_types,
                            COALESCE(json_agg(DISTINCT psc.name) FILTER (WHERE psc.name IS NOT NULL), '[]'::json) as product_series,
                            COALESCE(json_agg(DISTINCT ig.name) FILTER (WHERE ig.name IS NOT NULL), '[]'::json) as ink_grades,
                            COALESCE(json_agg(DISTINCT pt.id) FILTER (WHERE pt.id IS NOT NULL), '[]'::json) as type_ids,
                            COALESCE(json_agg(DISTINCT psc.id) FILTER (WHERE psc.id IS NOT NULL), '[]'::json) as series_ids,
                            COALESCE(json_agg(DISTINCT ig.id) FILTER (WHERE ig.id IS NOT NULL), '[]'::json) as grade_ids,
                            COALESCE(json_agg(
                                json_build_object(
                                    'size', fs.pack_size_kg || 'kg',
                                    'units', fs.quantity_units
                                ) ORDER BY fs.pack_size_kg ASC
                            ) FILTER (WHERE fs.quantity_units IS NOT NULL), '[]'::json) as "packDistribution",
                            COALESCE(SUM(fs.quantity_units), 0)::int as units,
                            COALESCE(SUM(fs.quantity_units * fs.pack_size_kg), 0)::numeric as mass
                        FROM colors c
                        LEFT JOIN finished_stock fs ON c.id = fs.color_id
                        LEFT JOIN color_product_types cpt ON c.id = cpt.color_id
                        LEFT JOIN product_types pt ON cpt.type_id = pt.id
                        LEFT JOIN color_product_series cps ON c.id = cps.color_id
                        LEFT JOIN product_series_categories psc ON cps.series_id = psc.id
                        LEFT JOIN color_ink_grades cig ON c.id = cig.color_id
                        LEFT JOIN ink_grades ig ON cig.grade_id = ig.id
                        GROUP BY c.id, c.name, c.color_code, c.business_code, c.hsn_code, c.description, c.tags, c.min_threshold_kg
                    )
                    SELECT *,
                           CASE 
                               WHEN mass < active_threshold THEN 'low'
                               ELSE 'healthy'
                           END as status
                    FROM color_stock
                    WHERE 1=1
                `;

                params = [];
                let paramIndex = 1;

                if (search) {
                    query += ` AND (color ILIKE $${paramIndex} OR business_code ILIKE $${paramIndex} OR tags::text ILIKE $${paramIndex})`;
                    params.push(`%${search}%`);
                    paramIndex++;
                }

                if (status) {
                    query += ` AND (CASE WHEN mass < active_threshold THEN 'low' ELSE 'healthy' END) = $${paramIndex++}`;
                    params.push(status);
                }

                if (series) {
                    query += ` AND id IN (
                        SELECT color_id FROM color_product_series cps 
                        JOIN product_series_categories psc ON cps.series_id = psc.id 
                        WHERE psc.name = $${paramIndex}
                        UNION
                        SELECT color_id FROM color_ink_grades cig
                        JOIN ink_grades ig ON cig.grade_id = ig.id
                        WHERE ig.name = $${paramIndex}
                    )`;
                    params.push(series);
                    paramIndex++;
                }

                if (productType) {
                    query += ` AND id IN (
                        SELECT color_id FROM color_product_types cpt
                        JOIN product_types pt ON cpt.type_id = pt.id
                        WHERE pt.name = $${paramIndex++}
                    )`;
                    params.push(productType);
                }

                if (packSize) {
                    const sizeNum = parseFloat(packSize);
                    if (!isNaN(sizeNum)) {
                        query += ` AND "packDistribution"::text LIKE $${paramIndex++}`;
                        params.push(`%${packSize}%`);
                    }
                }

                query += ` ORDER BY color ASC`;

                const result = await fastify.db.query(query, params);
                return reply.status(200).send(result.rows);

            } catch (err: any) {
                fastify.log.error(err);
                return reply.status(500).send({
                    error: 'Internal Server Error',
                    message: 'Failed to fetch inventory data'
                });
            }
        }
    });

    /**
     * POST /api/inventory/notify-manager
     * Allows an operator to notify the manager about low raw material stock.
     */
    fastify.post('/notify-manager', {
        schema: {
            body: Type.Object({
                resource_id: Type.Integer(),
                notes: Type.Optional(Type.String())
            }),
            security: [{ bearerAuth: [] }],
            response: {
                201: Type.Object({
                    message: Type.String()
                }),
                400: Type.Object({
                    error: Type.String(),
                    message: Type.String()
                }),
                500: Type.Object({
                    error: Type.String(),
                    message: Type.String()
                })
            }
        },
        preHandler: [fastify.authenticate],
        handler: async (request, reply): Promise<any> => {
            const user = (request as any).user as { id: number, role: string }
            const { resource_id, notes } = request.body as any

            try {
                // Check if there is already a pending request for this resource
                const existing = await fastify.db.query(
                    'SELECT id FROM material_requests WHERE resource_id = $1 AND status = $2',
                    [resource_id, 'pending']
                )

                if (existing.rows.length > 0) {
                    return reply.status(400).send({
                        error: 'Bad Request',
                        message: 'A notification has already been sent for this material.'
                    })
                }

                await fastify.db.query(
                    'INSERT INTO material_requests (resource_id, requested_by, notes) VALUES ($1, $2, $3)',
                    [resource_id, user.id, notes || 'Low stock notification']
                )

                return reply.status(201).send({
                    message: 'Manager notified successfully'
                })
            } catch (err) {
                fastify.log.error(err)
                return reply.status(500).send({
                    error: 'Internal Server Error',
                    message: 'Failed to notify manager'
                })
            }
        }
    })
}
