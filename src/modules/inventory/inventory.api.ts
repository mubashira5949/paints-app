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
                    totalVolume: Type.Number(),
                    packagedUnits: Type.Number(),
                    lowStockColors: Type.Number()
                }),
                500: Type.Object({
                    error: Type.String(),
                    message: Type.String()
                })
            },
            security: [{ bearerAuth: [] }]
        },
        preHandler: [fastify.authenticate],
        handler: async (request, reply) => {
            try {
                // Total Volume and Packaged Units
                const totalsQuery = `
                    SELECT 
                        COALESCE(SUM(quantity_units * pack_size_liters), 0)::float as "totalVolume",
                        COALESCE(SUM(quantity_units), 0)::int as "packagedUnits"
                    FROM finished_stock
                `;
                const totalsResult = await fastify.db.query(totalsQuery);
                const totals = totalsResult.rows[0];

                // Low Stock Colors Count
                // A color is low stock if its total volume is less than its min_threshold_liters
                const lowStockQuery = `
                    SELECT COUNT(*) as "lowStockColors"
                    FROM (
                        SELECT c.id
                        FROM colors c
                        LEFT JOIN finished_stock fs ON c.id = fs.color_id
                        GROUP BY c.id, c.min_threshold_liters
                        HAVING COALESCE(SUM(fs.quantity_units * fs.pack_size_liters), 0) < c.min_threshold_liters
                    ) AS low_stock_colors
                `;
                const lowStockResult = await fastify.db.query(lowStockQuery);
                const lowStockColors = parseInt(lowStockResult.rows[0].lowStockColors);

                return reply.status(200).send({
                    totalVolume: Number(totals.totalVolume),
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
                series: Type.Optional(Type.String())
            }),
            security: [{ bearerAuth: [] }],
            response: {
                200: Type.Array(Type.Object({
                    id: Type.Number(),
                    color: Type.String(),
                    color_code: Type.Union([Type.String(), Type.Null()]),
                    business_code: Type.Union([Type.String(), Type.Null()]),
                    series: Type.Union([Type.String(), Type.Null()]),
                    min_threshold_liters: Type.Number(),
                    packDistribution: Type.Array(Type.Object({
                        size: Type.String(),
                        units: Type.Number()
                    })),
                    units: Type.Number(),
                    volume: Type.Number(),
                    status: Type.String()
                })),
                500: Type.Object({
                    error: Type.String(),
                    message: Type.String()
                })
            }
        },
        preHandler: [fastify.authenticate],
        handler: async (request, reply) => {
            try {
                const { search, status, packSize, series } = request.query;

                let query = `
                    WITH color_stock AS (
                        SELECT 
                            c.id,
                            c.name as color,
                            c.color_code,
                            c.business_code,
                            c.series,
                            c.min_threshold_liters,
                            json_agg(
                                json_build_object(
                                    'size', fs.pack_size_liters || 'L',
                                    'units', fs.quantity_units
                                ) ORDER BY fs.pack_size_liters ASC
                            ) FILTER (WHERE fs.quantity_units IS NOT NULL) as "packDistribution",
                            COALESCE(SUM(fs.quantity_units), 0)::int as units,
                            COALESCE(SUM(fs.quantity_units * fs.pack_size_liters), 0)::float as volume
                        FROM colors c
                        LEFT JOIN finished_stock fs ON c.id = fs.color_id
                        GROUP BY c.id, c.name, c.color_code, c.business_code, c.series, c.min_threshold_liters
                    )
                    SELECT * FROM (
                        SELECT 
                            id,
                            color,
                            color_code,
                            business_code,
                            series,
                            min_threshold_liters,
                            COALESCE("packDistribution", '[]'::json) as "packDistribution",
                            units,
                            volume,
                            CASE 
                                WHEN volume < min_threshold_liters THEN 'low'
                                ELSE 'healthy'
                            END as status
                        FROM color_stock
                    ) as final_data
                    WHERE 1=1
                `;

                const params: any[] = [];
                let paramIndex = 1;

                if (search) {
                    query += ` AND color ILIKE $${paramIndex++}`;
                    params.push(`%${search}%`);
                }

                if (series) {
                    query += ` AND series = $${paramIndex++}`;
                    params.push(series);
                }

                if (status) {
                    query += ` AND status = $${paramIndex++}`;
                    params.push(status);
                }

                // If packSize is provided, we need to filter colors that have at least one pack of that size
                // Note: This filter is a bit tricky with the aggregated JSON. 
                // We'll add a subquery or join for this if needed, but the simple way is to check the finished_stock table.
                if (packSize) {
                    const sizeNum = parseFloat(packSize);
                    if (!isNaN(sizeNum)) {
                        query += ` AND EXISTS (
                            SELECT 1 FROM finished_stock fs2 
                            WHERE fs2.color_id = (SELECT id FROM colors c2 WHERE c2.name = final_data.color LIMIT 1)
                            AND fs2.pack_size_liters = $${paramIndex++}
                            AND fs2.quantity_units > 0
                        )`;
                        params.push(sizeNum);
                    }
                }

                query += ` ORDER BY color ASC`;

                const result = await fastify.db.query(query, params);
                return reply.status(200).send(result.rows);

            } catch (err) {
                fastify.log.error(err);
                return reply.status(500).send({
                    error: 'Internal Server Error',
                    message: 'Failed to fetch inventory data'
                });
            }
        }
    });
}
