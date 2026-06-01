import type { Pool, PoolClient } from 'pg'

/**
 * Wraps `fn` in a pg transaction. Checks out a dedicated client from the
 * pool, runs BEGIN, invokes `fn(tx)`, then COMMITs (or ROLLBACKs on throw).
 * The same `tx` reference is what callers should pass to pgtyped's
 * `.run(params, tx)` so every statement runs on the same connection.
 */
export async function withTransaction<T>(
    pool: Pool,
    fn: (tx: PoolClient) => Promise<T>,
): Promise<T> {
    const tx = await pool.connect()
    try {
        await tx.query('BEGIN')
        const result = await fn(tx)
        await tx.query('COMMIT')
        return result
    } catch (err) {
        await tx.query('ROLLBACK').catch(() => { /* swallow rollback errors */ })
        throw err
    } finally {
        tx.release()
    }
}
