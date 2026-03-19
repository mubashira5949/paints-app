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
                200: DashboardResponseSchema,
                500: Type.Object({
                    error: Type.String(),
                    message: Type.String()
                })
            },
            security: [{ bearerAuth: [] }]
        },
        preHandler: [fastify.authenticate],
        handler: async (request, reply) => {
            const start = performance.now();
            try {
                // Fetch all dashboard data in parallel for better performance
                const [metricsResult, chartResult, recentRunsResult, alertsResult] = await Promise.all([
                    // 1. Fetch Metrics
                    fastify.db.query(`
                        SELECT 
                            (SELECT COUNT(*) FROM resources) as "rawMaterials",
                            (SELECT COUNT(*) FROM resources WHERE current_stock <= reorder_level) as "lowStock",
                            (SELECT COALESCE(SUM(quantity_units), 0) FROM finished_stock) as "finishedStock",
                            (SELECT COUNT(*) FROM production_runs WHERE status = 'in_progress') as "activeRuns"
                    `),
                    // 2. Fetch Production Chart Data (Last 6 months)
                    fastify.db.query(`
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
                    `),
                    // 3. Fetch Recent Runs
                    fastify.db.query(`
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
                    `),
                    // 4. Fetch Inventory Alerts
                    fastify.db.query(`
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
                    `)
                ]);

                const metrics = metricsResult.rows[0];
                const productionChart = chartResult.rows.map(row => ({
                    month: row.month,
                    runs: row.runs
                }));
                const recentRuns = recentRunsResult.rows;
                const inventoryAlerts = alertsResult.rows;

                const duration = performance.now() - start;
                fastify.log.info(`Dashboard data fetched in ${duration.toFixed(2)}ms`);

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
