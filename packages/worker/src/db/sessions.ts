import { decrypt, encrypt } from "../crypto.js"
import type { Env } from "../env.js"

export async function createSetupSession(env: Env): Promise<string> {
    const id = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
    await env.DB.prepare(`INSERT INTO setup_sessions (id, expires_at) VALUES (?, ?)`)
        .bind(id, expiresAt)
        .run()
    return id
}

export async function saveSetupSessionToken(
    env: Env,
    sessionId: string,
    notionToken: string
): Promise<void> {
    const enc = await encrypt(env.ENCRYPTION_KEY, notionToken)
    await env.DB.prepare(
        `UPDATE setup_sessions SET notion_access_token_enc = ? WHERE id = ? AND datetime(expires_at) > datetime('now')`
    )
        .bind(enc, sessionId)
        .run()
}

export async function getSetupSessionToken(env: Env, sessionId: string): Promise<string | null> {
    const row = await env.DB.prepare(
        `SELECT notion_access_token_enc FROM setup_sessions WHERE id = ? AND datetime(expires_at) > datetime('now')`
    )
        .bind(sessionId)
        .first<{ notion_access_token_enc: string | null }>()

    if (!row?.notion_access_token_enc) return null
    return decrypt(env.ENCRYPTION_KEY, row.notion_access_token_enc)
}

export async function deleteSetupSession(env: Env, sessionId: string): Promise<void> {
    await env.DB.prepare(`DELETE FROM setup_sessions WHERE id = ?`).bind(sessionId).run()
}
