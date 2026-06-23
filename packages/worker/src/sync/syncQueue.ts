import type { SyncErrorCode } from "@knotcms/shared"
import { classifySyncError } from "@knotcms/shared"
import { getCustomerById, isCustomerEntitled } from "../db/customers.js"
import { getProject, isProjectAutoSyncEligible } from "../db/projects.js"
import type { Env } from "../env.js"
import { finishDebounceAndClear } from "../webhooks/debounce.js"
import { executePublishJob } from "./executePublishJob.js"
import { markPublishPendingAndSchedule } from "./scheduleTrailingPublish.js"
import { runSync } from "./runSync.js"

export type QueueJobMessage =
    | { kind: "sync"; projectId: string }
    | { kind: "publish"; projectId: string }

/** @deprecated Use QueueJobMessage — legacy messages omit `kind`. */
export type SyncJobMessage = QueueJobMessage | { projectId: string }

export type SyncJobSkipReason = "auto_sync_off" | "not_entitled" | "project_missing"

export type SyncJobOutcome =
    | { status: "synced"; itemsSynced: number; publishPending: boolean }
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

export function normalizeQueueMessage(body: SyncJobMessage): QueueJobMessage {
    if ("kind" in body && body.kind) {
        return body as QueueJobMessage
    }
    return { kind: "sync", projectId: body.projectId }
}

export async function enqueueSyncJobs(env: Env, projectIds: string[]): Promise<void> {
    if (projectIds.length === 0) return

    await env.SYNC_QUEUE.sendBatch(
        projectIds.map(projectId => ({ body: { kind: "sync", projectId } satisfies QueueJobMessage }))
    )
    console.log(`Enqueued ${projectIds.length} sync job(s): ${projectIds.join(", ")}`)
}

/** Debounce quiet window, then run sync if auto-sync + subscription allow. */
async function runDebouncedSyncForProject(
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
        const publishNote = result.publishPending
            ? ", live publish queued"
            : ""
        console.log(`Auto-sync OK ${projectId}: ${result.itemsSynced} items${publishNote}`)
        return {
            status: "synced",
            itemsSynced: result.itemsSynced,
            publishPending: Boolean(result.publishPending),
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
    const job = normalizeQueueMessage(message)

    if (job.kind === "publish") {
        const outcome = await executePublishJob(env, job.projectId)
        if (outcome.status === "retry") {
            return { ack: false, delaySeconds: outcome.delaySeconds }
        }
        return { ack: true }
    }

    const outcome = await runDebouncedSyncForProject(env, job.projectId)

    if (outcome.status === "failed" && outcome.retryable) {
        return { ack: false, delaySeconds: 60 }
    }

    return { ack: true }
}
