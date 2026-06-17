import type { Env } from "../env.js"
import type { DriveWatchRecord } from "../lib/google-drive-watch.js"
import { ensureWebhookSubscription, saveWebhookToken, updateWebhookStatus } from "./webhooks.js"

export interface StoredDriveWatch {
    channelId: string | null
    resourceId: string | null
    watchExpiresAt: string | null
    status: string | null
}

export async function getDriveWatchForProject(
    env: Env,
    projectId: string
): Promise<StoredDriveWatch | null> {
    const row = await env.DB.prepare(
        `SELECT source_subscription_id, watch_resource_id, watch_expires_at, status
         FROM webhook_subscriptions WHERE project_id = ?`
    )
        .bind(projectId)
        .first<{
            source_subscription_id: string | null
            watch_resource_id: string | null
            watch_expires_at: string | null
            status: string | null
        }>()

    if (!row) return null
    return {
        channelId: row.source_subscription_id,
        resourceId: row.watch_resource_id,
        watchExpiresAt: row.watch_expires_at,
        status: row.status,
    }
}

/** Persist channel id + token before calling Google — avoids 401 on the instant sync ping. */
export async function stageDriveWatchChannel(
    env: Env,
    projectId: string,
    staged: Pick<DriveWatchRecord, "channelId" | "channelToken" | "expiresAt">
): Promise<void> {
    await ensureWebhookSubscription(env, projectId)
    await saveWebhookToken(env, projectId, staged.channelToken)
    await env.DB.prepare(
        `UPDATE webhook_subscriptions
         SET source_subscription_id = ?, watch_expires_at = ?, status = 'pending', last_event_at = datetime('now')
         WHERE project_id = ?`
    )
        .bind(staged.channelId, staged.expiresAt, projectId)
        .run()
}

export async function saveDriveWatchForProject(
    env: Env,
    projectId: string,
    watch: DriveWatchRecord
): Promise<void> {
    await ensureWebhookSubscription(env, projectId)
    await saveWebhookToken(env, projectId, watch.channelToken)
    await env.DB.prepare(
        `UPDATE webhook_subscriptions
         SET source_subscription_id = ?, watch_resource_id = ?, watch_expires_at = ?, status = 'active', last_event_at = datetime('now')
         WHERE project_id = ?`
    )
        .bind(watch.channelId, watch.resourceId, watch.expiresAt, projectId)
        .run()
}

async function markDriveWatchExpired(env: Env, projectId: string): Promise<void> {
    await updateWebhookStatus(env, projectId, "expired")
}

export async function markDriveWatchPending(env: Env, projectId: string): Promise<void> {
    await updateWebhookStatus(env, projectId, "pending")
}
