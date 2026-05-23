/**
 * Production Irregularity Report (spec §3.9).
 *
 * Wastage / variance / dilution are derived columns on production_runs and
 * production_resource_actuals; this module just exposes the reports.
 */

import { FastifyInstance } from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'
import { authorizeRole } from '../../utils/authorizeRole'
import { productionIrregularityReport, lossesOperatorSummary } from '../../queries'

export default async function (fastifyRaw: FastifyInstance) {
    const fastify = fastifyRaw.withTypeProvider<TypeBoxTypeProvider>()

    fastify.get('/', {
        preHandler: [fastify.authenticate, authorizeRole(['manager'])],
        schema: {
            querystring: Type.Object({
                from:        Type.Optional(Type.String({ format: 'date' })),
                to:          Type.Optional(Type.String({ format: 'date' })),
                variant_id:  Type.Optional(Type.Integer()),
                operator_id: Type.Optional(Type.Integer()),
            }),
        },
        handler: async (request) => productionIrregularityReport.run({
            from_date:   request.query.from ?? null,
            to_date:     request.query.to ?? null,
            variant_id:  request.query.variant_id ?? null,
            operator_id: request.query.operator_id ?? null,
        }, fastify.db),
    })

    fastify.get('/operator-summary', {
        preHandler: [fastify.authenticate, authorizeRole(['manager'])],
        schema: {
            querystring: Type.Object({
                from: Type.Optional(Type.String({ format: 'date' })),
                to:   Type.Optional(Type.String({ format: 'date' })),
            }),
        },
        handler: async (request) => lossesOperatorSummary.run({
            from_date: request.query.from ?? null,
            to_date:   request.query.to ?? null,
        }, fastify.db),
    })
}
