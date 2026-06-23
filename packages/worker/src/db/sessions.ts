import { decrypt, encrypt } from "../crypto.js"
import type { Env } from "../env.js"

export async function createSetupSession(env: Env, customerId: string): Promise<string> {
    const id = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
    await env.DB.prepare(
        `INSERT INTO connect_sessions (id, customer_id, expires_at) VALUES (?, ?, ?)`
    )
        .bind(id, customerId, expiresAt)
        .run()
    return id
}

export async function setupSessionBelongsToCustomer(
    env: Env,
    sessionId: string,
    customerId: string
): Promise<boolean> {
    const row = await env.DB.prepare(
        `SELECT id FROM connect_sessions
         WHERE id = ? AND customer_id = ? AND datetime(expires_at) > datetime('now')`
    )
        .bind(sessionId, customerId)
        .first<{ id: string }>()

    return !!row
}

export async function saveSetupSessionToken(
    env: Env,
    sessionId: string,
    customerId: string,
    sourceToken: string
): Promise<boolean> {
    const enc = await encrypt(env.ENCRYPTION_KEY, sourceToken)
    const result = await env.DB.prepare(
        `UPDATE connect_sessions SET source_access_token_enc = ?
         WHERE id = ? AND customer_id = ? AND datetime(expires_at) > datetime('now')`
    )
        .bind(enc, sessionId, customerId)
        .run()

    return (result.meta?.changes ?? 0) > 0
}

export async function getSetupSessionToken(
    env: Env,
    sessionId: string,
    customerId: string
): Promise<string | null> {
    const row = await env.DB.prepare(
        `SELECT source_access_token_enc FROM connect_sessions
         WHERE id = ? AND customer_id = ? AND datetime(expires_at) > datetime('now')`
    )
        .bind(sessionId, customerId)
        .first<{ source_access_token_enc: string | null }>()

    if (!row?.source_access_token_enc) return null
    return decrypt(env.ENCRYPTION_KEY, row.source_access_token_enc)
}

export async function deleteSetupSession(env: Env, sessionId: string): Promise<void> {
    await env.DB.prepare(`DELETE FROM connect_sessions WHERE id = ?`).bind(sessionId).run()
}
