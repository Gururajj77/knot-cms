import type { SyncErrorCode } from "@notion-framer/shared"
import { classifySyncError } from "@notion-framer/shared"
import { updateWebhookStatus } from "../db.js"
import type { Env } from "../env.js"
import { finishDebounceAndClear } from "../webhooks/debounce.js"
import { runSync } from "./runSync.js"

export type SyncJobMessage = {
    projectId: string
}

export type SyncJobSkipReason = "auto_sync_off" | "not_entitled" | "project_missing"

export type SyncJobOutcome =
    | { status: "synced"; itemsSynced: number; published: boolean; publishSkipped?: boolean }
    | { status: "skipped"; reason: SyncJobSkipReason }
    | { status: "failed"; code: SyncErrorCode; message: string; retryable: boolean }

const NON_RETRYABLE_CODES = new Set<SyncErrorCode>([
    "SYNC_IN_PROGRESS",
    "LICENSE_INACTIVE",
    "PROJECT_NOT_FOUND",
    "SECRETS_MISSING",
    "FRAMER_UNAUTHORIZED",
    "FRAMER_FIELD_MISMATCH",
    "FRAMER_DUPLICATE_ITEM",
    "SLUG_COLLISION",
])

export function isSyncJobRetryable(code: SyncErrorCode): boolean {
    return !NON_RETRYABLE_CODES.has(code)
}

export async function enqueueSyncJobs(env: Env, projectIds: string[]): Promise<void> {
    if (projectIds.length === 0) return

    await env.SYNC_QUEUE.sendBatch(projectIds.map(projectId => ({ body: { projectId } })))
    console.log(`Enqueued ${projectIds.length} sync job(s): ${projectIds.join(", ")}`)
}

/** Debounce quiet window, then run sync if auto-sync + subscription allow. */
export async function runDebouncedSyncForProject(
    env: Env,
    projectId: string
): Promise<SyncJobOutcome> {
    await finishDebounceAndClear(env, projectId)

    const row = await env.DB.prepare(
        `SELECT p.auto_sync, p.customer_id, c.subscription_status
         FROM projects p
         LEFT JOIN customers c ON c.id = p.customer_id
         WHERE p.id = ?`
    )
        .bind(projectId)
        .first<{
            auto_sync: number
            customer_id: string | null
            subscription_status: string | null
        }>()

    if (!row) {
        return { status: "skipped", reason: "project_missing" }
    }

    const entitled = !row.customer_id || row.subscription_status === "active"
    if (row.auto_sync !== 1 || !entitled) {
        console.log(`Skipping sync for ${projectId} (auto_sync or subscription)`)
        return {
            status: "skipped",
            reason: row.auto_sync !== 1 ? "auto_sync_off" : "not_entitled",
        }
    }

    try {
        const result = await runSync(env, projectId)
        await updateWebhookStatus(env, projectId, "active")
        const publishNote = result.publishSkipped
            ? `, publish skipped (${result.publishSkipReason ?? "cooldown"})`
            : `, published=${result.published}`
        console.log(`Auto-sync OK ${projectId}: ${result.itemsSynced} items${publishNote}`)
        return {
            status: "synced",
            itemsSynced: result.itemsSynced,
            published: result.published,
            publishSkipped: result.publishSkipped,
        }
    } catch (error) {
        const { code, error: message } = classifySyncError(error)
        console.error(`Auto-sync failed for ${projectId} [${code}]:`, message)
        return {
            status: "failed",
            code,
            message,
            retryable: isSyncJobRetryable(code),
        }
    }
}

export async function processSyncQueueMessage(
    env: Env,
    message: SyncJobMessage
): Promise<{ ack: true } | { ack: false; delaySeconds: number }> {
    const outcome = await runDebouncedSyncForProject(env, message.projectId)

    if (outcome.status === "failed" && outcome.retryable) {
        return { ack: false, delaySeconds: 60 }
    }

    return { ack: true }
}
