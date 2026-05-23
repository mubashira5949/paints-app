/**
 * Dashboard widgets module (spec §3.9).
 */

import { FastifyInstance } from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import {
    dashboardCounts, dashboardLowStock, dashboardPendingRequests,
    dashboardOpenPOs, dashboardPendingDeviceApprovals,
    dashboardFlaggedRunsLast30, dashboardOverdueSales,
} from '../../queries'

export default async function (fastifyRaw: FastifyInstance) {
    const fastify = fastifyRaw.withTypeProvider<TypeBoxTypeProvider>()

    fastify.get('/dashboard', {
        preHandler: [fastify.authenticate],
        handler: async () => {
            const [
                counts, lowStock, pendingRequests, openPOs,
                pendingDevices, flagged30, overdue,
            ] = await Promise.all([
                dashboardCounts.run(undefined as any, fastify.db),
                dashboardLowStock.run(undefined as any, fastify.db),
                dashboardPendingRequests.run(undefined as any, fastify.db),
                dashboardOpenPOs.run(undefined as any, fastify.db),
                dashboardPendingDeviceApprovals.run(undefined as any, fastify.db),
                dashboardFlaggedRunsLast30.run(undefined as any, fastify.db),
                dashboardOverdueSales.run(undefined as any, fastify.db),
            ])
            return {
                counts: counts[0],
                low_stock_resources:           lowStock,
                pending_production_requests:   pendingRequests,
                open_purchase_orders:          openPOs,
                pending_device_approvals:      pendingDevices,
                flagged_runs_last_30_days:     flagged30,
                overdue_sales:                 overdue,
            }
        },
    })
}
