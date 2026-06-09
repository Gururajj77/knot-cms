import type { Env } from "../env.js"
import { NOTION_WEBHOOK_TOKEN_KEY, setIntegrationSetting } from "./integration-settings.js"

export async function saveWebhookToken(
    env: Env,
    projectId: string,
    verificationToken: string
): Promise<void> {
    await env.DB.prepare(`UPDATE secrets SET source_webhook_verification_token = ? WHERE project_id = ?`)
        .bind(verificationToken, projectId)
        .run()
}

/** One integration-level Notion webhook signing secret (not per-project). */
export async function saveIntegrationWebhookToken(env: Env, verificationToken: string): Promise<void> {
    await setIntegrationSetting(env, NOTION_WEBHOOK_TOKEN_KEY, verificationToken)
}

export async function updateWebhookStatus(env: Env, projectId: string, status: string): Promise<void> {
    await env.DB.prepare(
        `UPDATE webhook_subscriptions SET status = ?, last_event_at = datetime('now') WHERE project_id = ?`
    )
        .bind(status, projectId)
        .run()
}

/** Notion webhooks are integration-level — one verified endpoint covers all auto-sync projects. */
export async function markAutoSyncWebhooksActive(env: Env, projectIds?: string[]): Promise<void> {
    if (projectIds && projectIds.length > 0) {
        for (const projectId of projectIds) {
            await updateWebhookStatus(env, projectId, "active")
        }
        return
    }

    const rows = await env.DB.prepare(`SELECT id FROM projects WHERE auto_sync = 1`).all<{ id: string }>()
    for (const row of rows.results ?? []) {
        await updateWebhookStatus(env, row.id, "active")
    }
}
