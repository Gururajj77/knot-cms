import type { Env } from "../env.js"

export const NOTION_WEBHOOK_TOKEN_KEY = "notion_webhook_verification_token"

async function getIntegrationSetting(env: Env, key: string): Promise<string | null> {
    const row = await env.DB.prepare(`SELECT value FROM integration_settings WHERE key = ?`)
        .bind(key)
        .first<{ value: string }>()
    return row?.value ?? null
}

export async function setIntegrationSetting(env: Env, key: string, value: string): Promise<void> {
    await env.DB.prepare(
        `INSERT INTO integration_settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`
    )
        .bind(key, value)
        .run()
}

/** Read Notion webhook token; migrates legacy per-project token if needed. */
export async function getNotionWebhookVerificationToken(env: Env): Promise<string | null> {
    const stored = await getIntegrationSetting(env, NOTION_WEBHOOK_TOKEN_KEY)
    if (stored) return stored

    const legacy = await env.DB.prepare(
        `SELECT source_webhook_verification_token AS value FROM secrets
         WHERE source_webhook_verification_token IS NOT NULL
         LIMIT 1`
    ).first<{ value: string }>()

    if (!legacy?.value) return null

    await setIntegrationSetting(env, NOTION_WEBHOOK_TOKEN_KEY, legacy.value)
    return legacy.value
}
