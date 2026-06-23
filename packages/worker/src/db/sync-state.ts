import type { Env } from "../env.js"

/** Quiet period after the last Notion webhook before auto-sync runs. */
export const WEBHOOK_DEBOUNCE_MS = 10_000

/** Min gap between Framer publish() calls — avoids "Publishing is currently unavailable". */
const PUBLISH_COOLDOWN_PREVIEW_MS = 3 * 60 * 1000
const PUBLISH_COOLDOWN_DEPLOY_MS = 5 * 60 * 1000

export async function getLastPublishAt(env: Env, projectId: string): Promise<string | null> {
    const row = await env.DB.prepare(`SELECT last_publish_at FROM sync_state WHERE project_id = ?`)
        .bind(projectId)
        .first<{ last_publish_at: string | null }>()
    return row?.last_publish_at ?? null
}

export async function recordLastPublishAt(env: Env, projectId: string, at: string): Promise<void> {
    await env.DB.prepare(`UPDATE sync_state SET last_publish_at = ? WHERE project_id = ?`)
        .bind(at, projectId)
        .run()
}

/** Allow immediate publish on next sync after re-enabling auto-publish. */
export async function clearLastPublishAt(env: Env, projectId: string): Promise<void> {
    await env.DB.prepare(
        `UPDATE sync_state SET last_publish_at = NULL, last_publish_skip_reason = NULL,
         publish_pending = 0, publish_scheduled_at = NULL
         WHERE project_id = ?`
    )
        .bind(projectId)
        .run()
}

export async function markPublishPending(env: Env, projectId: string): Promise<void> {
    await env.DB.prepare(`UPDATE sync_state SET publish_pending = 1 WHERE project_id = ?`)
        .bind(projectId)
        .run()
}

export async function getPublishPending(env: Env, projectId: string): Promise<boolean> {
    const row = await env.DB.prepare(`SELECT publish_pending FROM sync_state WHERE project_id = ?`)
        .bind(projectId)
        .first<{ publish_pending: number | null }>()
    return row?.publish_pending === 1
}

export async function getPublishScheduledAt(env: Env, projectId: string): Promise<string | null> {
    const row = await env.DB.prepare(
        `SELECT publish_scheduled_at FROM sync_state WHERE project_id = ?`
    )
        .bind(projectId)
        .first<{ publish_scheduled_at: string | null }>()
    return row?.publish_scheduled_at ?? null
}

export async function setPublishScheduledAt(
    env: Env,
    projectId: string,
    at: string
): Promise<void> {
    await env.DB.prepare(`UPDATE sync_state SET publish_scheduled_at = ? WHERE project_id = ?`)
        .bind(at, projectId)
        .run()
}

export async function clearPublishScheduledAt(env: Env, projectId: string): Promise<void> {
    await env.DB.prepare(`UPDATE sync_state SET publish_scheduled_at = NULL WHERE project_id = ?`)
        .bind(projectId)
        .run()
}

function publishCooldownMs(publishMode: string): number {
    return publishMode === "deploy_live" ? PUBLISH_COOLDOWN_DEPLOY_MS : PUBLISH_COOLDOWN_PREVIEW_MS
}

export function publishCooldownRemainingMs(lastPublishAt: string, publishMode: string): number {
    const elapsed = Date.now() - new Date(lastPublishAt).getTime()
    return Math.max(0, publishCooldownMs(publishMode) - elapsed)
}

export async function updateSyncState(
    env: Env,
    projectId: string,
    update: {
        lastSyncAt?: string
        lastError?: string | null
        lastErrorCode?: string | null
        itemsSyncedCount?: number
        lastPublishSkipReason?: string | null
    }
): Promise<void> {
    const statements = []

    if (update.lastSyncAt !== undefined) {
        statements.push(
            env.DB.prepare(
                `UPDATE sync_state SET last_sync_at = ?, last_error = NULL, last_error_code = NULL, items_synced_count = COALESCE(?, items_synced_count), last_publish_skip_reason = ?
         WHERE project_id = ?`
            ).bind(
                update.lastSyncAt,
                update.itemsSyncedCount ?? null,
                update.lastPublishSkipReason ?? null,
                projectId
            )
        )
    }
    if (update.lastError !== undefined) {
        statements.push(
            env.DB.prepare(
                `UPDATE sync_state SET last_error = ?, last_error_code = ? WHERE project_id = ?`
            ).bind(update.lastError, update.lastErrorCode ?? null, projectId)
        )
    }

    if (update.lastPublishSkipReason !== undefined && update.lastSyncAt === undefined) {
        statements.push(
            env.DB.prepare(`UPDATE sync_state SET last_publish_skip_reason = ? WHERE project_id = ?`)
                .bind(update.lastPublishSkipReason, projectId)
        )
    }

    if (statements.length === 1) {
        await statements[0].run()
    } else if (statements.length > 1) {
        await env.DB.batch(statements)
    }
}

/** Prevent overlapping syncs for the same project (webhook + manual). */
export async function tryAcquireSyncLock(env: Env, projectId: string): Promise<boolean> {
    const result = await env.DB.prepare(
        `UPDATE sync_state SET sync_lock_until = datetime('now', '+3 minutes')
     WHERE project_id = ?
       AND (sync_lock_until IS NULL OR datetime(sync_lock_until) <= datetime('now'))`
    )
        .bind(projectId)
        .run()
    return (result.meta?.changes ?? 0) > 0
}

export async function releaseSyncLock(env: Env, projectId: string): Promise<void> {
    await env.DB.prepare(`UPDATE sync_state SET sync_lock_until = NULL WHERE project_id = ?`)
        .bind(projectId)
        .run()
}

/**
 * Push the quiet window forward after a webhook. Returns true only for the first
 * event in a burst — callers should enqueue one sync job when true; later events
 * only extend the timer for the job already in the queue.
 */
export async function scheduleDebounceSync(env: Env, projectId: string): Promise<boolean> {
    const hadPendingDebounce = (await getDebounceScheduledAt(env, projectId)) !== null
    const scheduledAt = new Date(Date.now() + WEBHOOK_DEBOUNCE_MS).toISOString()
    await env.DB.prepare(
        `INSERT INTO debounce_sync (project_id, scheduled_at) VALUES (?, ?)
     ON CONFLICT(project_id) DO UPDATE SET scheduled_at = excluded.scheduled_at`
    )
        .bind(projectId, scheduledAt)
        .run()
    return !hadPendingDebounce
}

async function getDueDebounceProjects(env: Env): Promise<string[]> {
    const result = await env.DB.prepare(
        `SELECT project_id FROM debounce_sync WHERE datetime(scheduled_at) <= datetime('now')`
    ).all<{ project_id: string }>()
    return (result.results ?? []).map(r => r.project_id)
}

export async function getDebounceScheduledAt(env: Env, projectId: string): Promise<string | null> {
    const row = await env.DB.prepare(`SELECT scheduled_at FROM debounce_sync WHERE project_id = ?`)
        .bind(projectId)
        .first<{ scheduled_at: string }>()
    return row?.scheduled_at ?? null
}

export async function clearDebounce(env: Env, projectId: string): Promise<void> {
    await env.DB.prepare(`DELETE FROM debounce_sync WHERE project_id = ?`).bind(projectId).run()
}
