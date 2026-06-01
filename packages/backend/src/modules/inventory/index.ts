/**
 * Inventory module — read-only views over the canonical DDL tables (spec §3.2 + §3.4).
 */

import { FastifyInstance } from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'
import {
    finishedInventoryGrouped, finishedPacksByVariant, stashList, resourceInventory,
} from '../../queries'

const VariantIdParam = Type.Object({ variantId: Type.Integer({ minimum: 1 }) })

const FinishedQuery = Type.Object({
    variant_id: Type.Optional(Type.Integer({ minimum: 1 })),
    status:     Type.Optional(Type.Union([
        Type.Literal('in_stock'),         Type.Literal('ready_for_shipment'),
        Type.Literal('shipped'),          Type.Literal('sold'),
        Type.Literal('lost'),             Type.Literal('returned'),
    ])),
})

const ResourcesQuery = Type.Object({
    low_stock_only: Type.Optional(Type.Boolean()),
})

export default async function (fastifyRaw: FastifyInstance) {
    const fastify = fastifyRaw.withTypeProvider<TypeBoxTypeProvider>()

    fastify.get('/finished', {
        preHandler: [fastify.authenticate],
        schema: { querystring: FinishedQuery },
        handler: async (request) => finishedInventoryGrouped.run({
            variant_id: request.query.variant_id ?? null,
            status:     (request.query.status ?? null) as any,
        }, fastify.db),
    })

    fastify.get('/finished/by-variant/:variantId', {
        preHandler: [fastify.authenticate],
        schema: { params: VariantIdParam },
        handler: async (request) => finishedPacksByVariant.run({ variant_id: request.params.variantId }, fastify.db),
    })

    fastify.get('/finished/stash', {
        preHandler: [fastify.authenticate],
        handler: async () => stashList.run(undefined as any, fastify.db),
    })

    fastify.get('/resources', {
        preHandler: [fastify.authenticate],
        schema: { querystring: ResourcesQuery },
        handler: async (request) => {
            const rows = await resourceInventory.run(undefined as any, fastify.db)
            return request.query.low_stock_only ? rows.filter((r: any) => r.is_low_stock) : rows
        },
    })
}
