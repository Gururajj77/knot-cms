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
