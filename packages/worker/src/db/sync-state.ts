import type { Env } from "../env.js"

/** Quiet period after the last Notion webhook before auto-sync runs. */
export const WEBHOOK_DEBOUNCE_MS = 10_000

export async function updateSyncState(
    env: Env,
    projectId: string,
    update: {
        lastSyncAt?: string
        lastError?: string | null
        lastErrorCode?: string | null
        itemsSyncedCount?: number
    }
): Promise<void> {
    const statements = []

    if (update.lastSyncAt !== undefined) {
        statements.push(
            env.DB.prepare(
                `UPDATE sync_state SET last_sync_at = ?, last_error = NULL, last_error_code = NULL, items_synced_count = COALESCE(?, items_synced_count)
         WHERE project_id = ?`
            ).bind(update.lastSyncAt, update.itemsSyncedCount ?? null, projectId)
        )
    }
    if (update.lastError !== undefined) {
        statements.push(
            env.DB.prepare(
                `UPDATE sync_state SET last_error = ?, last_error_code = ? WHERE project_id = ?`
            ).bind(update.lastError, update.lastErrorCode ?? null, projectId)
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

export async function scheduleDebounceSync(env: Env, projectId: string): Promise<void> {
    const scheduledAt = new Date(Date.now() + WEBHOOK_DEBOUNCE_MS).toISOString()
    await env.DB.prepare(
        `INSERT INTO debounce_sync (project_id, scheduled_at) VALUES (?, ?)
     ON CONFLICT(project_id) DO UPDATE SET scheduled_at = excluded.scheduled_at`
    )
        .bind(projectId, scheduledAt)
        .run()
}

export async function getDueDebounceProjects(env: Env): Promise<string[]> {
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
