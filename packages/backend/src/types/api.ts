/**
 * Ergonomic aliases over `openapi.gen.ts` so handlers can write
 *
 *     const handler: Handler = async (req) => ({...})
 *     // rather than
 *     const handler: paths['/paints']['get']['responses']['200']['content']['application/json']
 *
 * `openapi.gen.ts` is regenerated from `openapi.yaml` via `npm run openapi:typegen`.
 */

import type { paths, components } from './openapi.gen'

// Reusable component schemas (entities, requests, enums).
export type Schemas = components['schemas']

// Per-route shortcuts: { Body, Params, Query, Response }
type Method = 'get' | 'post' | 'put' | 'patch' | 'delete'

type ContentJson<T> = T extends { content: { 'application/json': infer R } } ? R : never

type ResponseFor<P extends keyof paths, M extends Method> =
    paths[P][M] extends { responses: infer R }
        ? R extends { 200: infer V } ? ContentJson<V>
        : R extends { 201: infer V } ? ContentJson<V>
        : never
        : never

type BodyFor<P extends keyof paths, M extends Method> =
    paths[P][M] extends { requestBody?: infer B }
        ? B extends { content: { 'application/json': infer R } } ? R : never
        : never

type ParamsFor<P extends keyof paths, M extends Method> =
    paths[P][M] extends { parameters: { path: infer R } } ? R : never

type QueryFor<P extends keyof paths, M extends Method> =
    paths[P][M] extends { parameters: { query?: infer R } } ? R : never

export type Route<P extends keyof paths, M extends Method> = {
    Body:     BodyFor<P, M>
    Params:   ParamsFor<P, M>
    Query:    QueryFor<P, M>
    Response: ResponseFor<P, M>
}
