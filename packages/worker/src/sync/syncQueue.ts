import type { SyncErrorCode } from "@knotcms/shared"
import { classifySyncError } from "@knotcms/shared"
import { getCustomerById, isCustomerEntitled } from "../db/customers.js"
import { getProject, isProjectAutoSyncEligible } from "../db/projects.js"
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
    "PLAN_LIMIT",
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

    const project = await getProject(env, projectId)
    if (!project) {
        return { status: "skipped", reason: "project_missing" }
    }

    if (!(await isProjectAutoSyncEligible(env, project))) {
        const customer = project.customer_id ? await getCustomerById(env, project.customer_id) : null
        const reason =
            project.auto_sync !== 1
                ? "auto_sync_off"
                : !isCustomerEntitled(customer)
                  ? "not_entitled"
                  : "auto_sync_off"
        console.log(`Skipping sync for ${projectId} (${reason})`)
        return { status: "skipped", reason: reason === "not_entitled" ? "not_entitled" : "auto_sync_off" }
    }

    try {
        const result = await runSync(env, projectId)
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
