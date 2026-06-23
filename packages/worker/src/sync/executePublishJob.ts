import {
    clearPublishScheduledAt,
    getLastPublishAt,
    getPublishPending,
    getProjectSecrets,
    publishCooldownRemainingMs,
    recordLastPublishAt,
    releaseSyncLock,
    tryAcquireSyncLock,
    updateSyncState,
} from "../db.js"
import { getProject } from "../db/projects.js"
import { getDebounceScheduledAt } from "../db/sync-state.js"
import type { Env } from "../env.js"
import { connect } from "framer-api"
import { publishIfEnabled } from "./framerCollection.js"
import { rescheduleTrailingPublish } from "./scheduleTrailingPublish.js"

export type PublishJobOutcome =
    | { status: "published"; deployed: boolean }
    | { status: "skipped" }
    | { status: "rescheduled" }
    | { status: "retry"; delaySeconds: number }

/** Trailing publish: deploy after edits settle and Framer cooldown allows. */
export async function executePublishJob(env: Env, projectId: string): Promise<PublishJobOutcome> {
    const project = await getProject(env, projectId)
    if (!project || project.auto_publish !== 1) {
        await clearPublishScheduledAt(env, projectId)
        return { status: "skipped" }
    }

    if (!(await getPublishPending(env, projectId))) {
        await clearPublishScheduledAt(env, projectId)
        return { status: "skipped" }
    }

    const debounceAt = await getDebounceScheduledAt(env, projectId)
    if (debounceAt) {
        const remainingMs = new Date(debounceAt).getTime() - Date.now()
        if (remainingMs > 0) {
            const delaySeconds = Math.max(1, Math.ceil(remainingMs / 1000) + 1)
            await rescheduleTrailingPublish(env, projectId, delaySeconds)
            console.log(`[publish ${projectId}] Waiting for edit burst to settle (${delaySeconds}s)`)
            return { status: "rescheduled" }
        }
    }

    const locked = await tryAcquireSyncLock(env, projectId)
    if (!locked) {
        return { status: "retry", delaySeconds: 30 }
    }

    try {
        if (!(await getPublishPending(env, projectId))) {
            await clearPublishScheduledAt(env, projectId)
            return { status: "skipped" }
        }

        const lastPublishAt = await getLastPublishAt(env, projectId)
        if (lastPublishAt) {
            const cooldownMs = publishCooldownRemainingMs(lastPublishAt, project.publish_mode)
            if (cooldownMs > 0) {
                const delaySeconds = Math.max(1, Math.ceil(cooldownMs / 1000))
                await rescheduleTrailingPublish(env, projectId, delaySeconds)
                console.log(`[publish ${projectId}] Cooldown — retry in ${delaySeconds}s`)
                return { status: "rescheduled" }
            }
        }

        const secrets = await getProjectSecrets(env, projectId)
        if (!secrets) {
            await updateSyncState(env, projectId, {
                lastPublishSkipReason: "Project secrets not found",
            })
            return { status: "skipped" }
        }

        const projectUrl = project.framer_project_url.replace(/\/$/, "")
        using framer = await connect(projectUrl, secrets.framerApiKey)

        try {
            const result = await publishIfEnabled(framer, true, project.publish_mode)
            await recordLastPublishAt(env, projectId, new Date().toISOString())
            await clearPublishScheduledAt(env, projectId)
            await env.DB.prepare(
                `UPDATE sync_state SET publish_pending = 0, last_publish_skip_reason = NULL WHERE project_id = ?`
            )
                .bind(projectId)
                .run()

            console.log(
                `[publish ${projectId}] Live site published (deployed=${result.deployed})`
            )
            return { status: "published", deployed: result.deployed }
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            console.warn(`[publish ${projectId}] Publish failed: ${message}`)
            await updateSyncState(env, projectId, {
                lastPublishSkipReason: message.slice(0, 240),
            })
            return { status: "retry", delaySeconds: 120 }
        }
    } finally {
        await releaseSyncLock(env, projectId)
    }
}
