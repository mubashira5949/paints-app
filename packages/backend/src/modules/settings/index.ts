/**
 * Settings + pack sizes (spec §3.3, §3.6).
 */

import { FastifyInstance } from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'
import { authorizeRole } from '../../utils/authorizeRole'
import {
    listAppSettings, getAppSetting, upsertAppSetting, deleteAppSetting,
    listPackSizes, upsertPackSize, disablePackSize,
} from '../../queries'

const KEY_DEFAULTS: Record<string, unknown> = {
    wastage_threshold_pct:           5,
    resource_variance_threshold_pct: 10,
    dilution_threshold_pct:          10,
    financial_tolerance:             { mode: 'pct', value: 1 },
    low_stock_threshold_kg:          { kg: 0 },
}

const KeyParam     = Type.Object({ key: Type.String({ pattern: '^[a-z][a-z0-9_.]*$', maxLength: 100 }) })
const KgParam      = Type.Object({ kg:  Type.Number({ exclusiveMinimum: 0 }) })
const UpsertBody   = Type.Object({ value: Type.Unknown() })
const PackSizeBody = Type.Object({ pack_size_kg: Type.Number({ exclusiveMinimum: 0 }) })

export default async function (fastifyRaw: FastifyInstance) {
    const fastify = fastifyRaw.withTypeProvider<TypeBoxTypeProvider>()

    fastify.get('/', {
        preHandler: [fastify.authenticate],
        handler: async () => {
            const rows = await listAppSettings.run(undefined as any, fastify.db)
            const stored = new Map<string, any>(rows.map((r: any) => [r.key, r]))
            const out: Record<string, any> = {}
            for (const [key, def] of Object.entries(KEY_DEFAULTS)) {
                if (stored.has(key)) {
                    const row = stored.get(key)
                    out[key] = { value: row.value, source: 'configured', updated_at: row.updated_at, updated_by: row.updated_by }
                } else {
                    out[key] = { value: def, source: 'default' }
                }
            }
            for (const [key, row] of stored) {
                if (!(key in out)) out[key] = { value: row.value, source: 'configured', updated_at: row.updated_at, updated_by: row.updated_by }
            }
            return out
        },
    })

    fastify.get('/:key', {
        preHandler: [fastify.authenticate],
        schema: { params: KeyParam },
        handler: async (request, reply) => {
            const key = request.params.key
            const rows = await getAppSetting.run({ key }, fastify.db)
            if (rows.length > 0) return { key, value: rows[0].value, source: 'configured', updated_at: rows[0].updated_at, updated_by: rows[0].updated_by }
            if (key in KEY_DEFAULTS)  return { key, value: KEY_DEFAULTS[key], source: 'default' }
            return reply.status(404).send({ error: 'Not Found', message: 'Setting not found' })
        },
    })

    fastify.put('/:key', {
        preHandler: [fastify.authenticate, authorizeRole(['manager'])],
        schema: { params: KeyParam, body: UpsertBody },
        handler: async (request, reply) => {
            const user = request.user as any
            const key = request.params.key
            try {
                await upsertAppSetting.run({ key, value: JSON.stringify(request.body.value), user_id: user.id }, fastify.db)
                return { key, value: request.body.value, source: 'configured' }
            } catch (err) {
                fastify.log.error(err)
                return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to save setting' })
            }
        },
    })

    fastify.delete('/:key', {
        preHandler: [fastify.authenticate, authorizeRole(['manager'])],
        schema: { params: KeyParam },
        handler: async (request) => {
            await deleteAppSetting.run({ key: request.params.key }, fastify.db)
            return { key: request.params.key, value: KEY_DEFAULTS[request.params.key] ?? null, source: 'default' }
        },
    })

    fastify.get('/pack-sizes', {
        preHandler: [fastify.authenticate],
        handler: async () => listPackSizes.run(undefined as any, fastify.db),
    })

    fastify.post('/pack-sizes', {
        preHandler: [fastify.authenticate, authorizeRole(['manager'])],
        schema: { body: PackSizeBody },
        handler: async (request, reply) => {
            const kg = request.body.pack_size_kg
            try {
                await upsertPackSize.run({ pack_size_kg: kg as any }, fastify.db)
                return reply.status(201).send({ pack_size_kg: kg })
            } catch (err) {
                fastify.log.error(err)
                return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to add pack size' })
            }
        },
    })

    fastify.delete('/pack-sizes/:kg', {
        preHandler: [fastify.authenticate, authorizeRole(['manager'])],
        schema: { params: KgParam },
        handler: async (request, reply) => {
            const rows = await disablePackSize.run({ pack_size_kg: request.params.kg as any }, fastify.db)
            if (rows.length === 0) return reply.status(404).send({ error: 'Not Found', message: 'Pack size not found or already inactive' })
            return { pack_size_kg: rows[0].pack_size_kg, is_active: false }
        },
    })
}
