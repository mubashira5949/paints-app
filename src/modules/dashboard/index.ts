import { FastifyInstance } from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'

export default async function (fastifyRaw: FastifyInstance) {
    const fastify = fastifyRaw.withTypeProvider<TypeBoxTypeProvider>()

    const DashboardResponseSchema = Type.Object({
        metrics: Type.Object({
            rawMaterials: Type.Number(),
            lowStock: Type.Number(),
            finishedStock: Type.Number(),
            activeRuns: Type.Number()
        }),
        productionChart: Type.Array(Type.Object({
            month: Type.String(),
            runs: Type.Number()
        })),
        recentRuns: Type.Array(Type.Object({
            batchId: Type.String(),
            color: Type.String(),
            output: Type.Union([Type.Number(), Type.Null()]),
            operator: Type.String()
        })),
        inventoryAlerts: Type.Array(Type.Object({
            material: Type.String(),
            remaining: Type.String(),
            status: Type.String()
        }))
    })

    /**
     * GET /api/dashboard - Returns aggregated dashboard data.
     */
    fastify.get('/dashboard', {
        schema: {
            response: {
                200: DashboardResponseSchema
            },
            security: [{ bearerAuth: [] }]
        },
        preHandler: [fastify.authenticate],
        handler: async (request, reply) => {
            try {
                // 1. Fetch Metrics
                const metricsQuery = `
                    SELECT 
                        (SELECT COUNT(*) FROM resources) as "rawMaterials",
                        (SELECT COUNT(*) FROM resources WHERE current_stock <= reorder_level) as "lowStock",
                        (SELECT COALESCE(SUM(quantity_units), 0) FROM finished_stock) as "finishedStock",
                        (SELECT COUNT(*) FROM production_runs WHERE status = 'in_progress') as "activeRuns"
                `;
                const metricsResult = await fastify.db.query(metricsQuery);
                const metrics = metricsResult.rows[0];

                // 2. Fetch Production Chart Data (Last 6 months)
                const chartQuery = `
                    SELECT 
                        TO_CHAR(month_series, 'Mon') as month,
                        COUNT(pr.id)::int as runs,
                        TO_CHAR(month_series, 'YYYY-MM') as sort_key
                    FROM 
                        generate_series(
                            CURRENT_DATE - INTERVAL '5 months', 
                            CURRENT_DATE, 
                            '1 month'::interval
                        ) AS month_series
                    LEFT JOIN production_runs pr ON TO_CHAR(pr.created_at, 'YYYY-MM') = TO_CHAR(month_series, 'YYYY-MM')
                    GROUP BY month, sort_key
                    ORDER BY sort_key ASC
                `;
                const chartResult = await fastify.db.query(chartQuery);
                const productionChart = chartResult.rows.map(row => ({
                    month: row.month,
                    runs: row.runs
                }));

                // 3. Fetch Recent Runs
                const recentRunsQuery = `
                    SELECT 
                        'B-' || pr.id as "batchId", 
                        c.name as color, 
                        pr.actual_quantity_liters::float as output, 
                        u.username as operator
                    FROM production_runs pr
                    JOIN recipes r ON pr.recipe_id = r.id
                    JOIN colors c ON r.color_id = c.id
                    JOIN users u ON pr.created_by = u.id
                    ORDER BY pr.created_at DESC
                    LIMIT 5
                `;
                const recentRunsResult = await fastify.db.query(recentRunsQuery);
                const recentRuns = recentRunsResult.rows;

                // 4. Fetch Inventory Alerts
                const alertsQuery = `
                    SELECT 
                        name as material, 
                        current_stock || ' ' || unit as remaining,
                        CASE 
                            WHEN current_stock <= (reorder_level * 0.5) THEN 'critical' 
                            ELSE 'low' 
                        END as status
                    FROM resources
                    WHERE current_stock <= reorder_level
                    ORDER BY current_stock / NULLIF(reorder_level, 0) ASC
                    LIMIT 5
                `;
                const alertsResult = await fastify.db.query(alertsQuery);
                const inventoryAlerts = alertsResult.rows;

                return {
                    metrics: {
                        rawMaterials: parseInt(metrics.rawMaterials),
                        lowStock: parseInt(metrics.lowStock),
                        finishedStock: parseInt(metrics.finishedStock),
                        activeRuns: parseInt(metrics.activeRuns)
                    },
                    productionChart,
                    recentRuns,
                    inventoryAlerts
                };
            } catch (err) {
                fastify.log.error(err);
                return reply.status(500).send({
                    error: 'Internal Server Error',
                    message: 'Failed to fetch dashboard data'
                });
            }
        }
    });
}
