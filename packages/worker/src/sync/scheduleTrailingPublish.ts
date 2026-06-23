import {
    clearPublishScheduledAt,
    getLastPublishAt,
    getPublishPending,
    getPublishScheduledAt,
    markPublishPending,
    publishCooldownRemainingMs,
    setPublishScheduledAt,
} from "../db.js"
import { getProject } from "../db/projects.js"
import { getDebounceScheduledAt } from "../db/sync-state.js"
import type { Env } from "../env.js"
import type { QueueJobMessage } from "./syncQueue.js"

const MIN_PUBLISH_DELAY_SEC = 1

/** Mark CMS ahead of live site and queue a trailing publish attempt. */
export async function markPublishPendingAndSchedule(
    env: Env,
    projectId: string
): Promise<void> {
    const project = await getProject(env, projectId)
    if (!project || project.auto_publish !== 1) return

    await markPublishPending(env, projectId)
    await scheduleTrailingPublish(env, projectId)
}

export async function scheduleTrailingPublish(env: Env, projectId: string): Promise<void> {
    const project = await getProject(env, projectId)
    if (!project || project.auto_publish !== 1) return

    if (!(await getPublishPending(env, projectId))) return

    const lastPublishAt = await getLastPublishAt(env, projectId)
    const cooldownMs = lastPublishAt
        ? publishCooldownRemainingMs(lastPublishAt, project.publish_mode)
        : 0

    let delayMs = cooldownMs
    const debounceAt = await getDebounceScheduledAt(env, projectId)
    if (debounceAt) {
        const debounceRemainingMs = new Date(debounceAt).getTime() - Date.now()
        if (debounceRemainingMs > 0) {
            delayMs = Math.max(delayMs, debounceRemainingMs + 1000)
        }
    }

    const delaySeconds = Math.max(MIN_PUBLISH_DELAY_SEC, Math.ceil(delayMs / 1000))

    const targetAt = new Date(Date.now() + delaySeconds * 1000).toISOString()
    const existingScheduledAt = await getPublishScheduledAt(env, projectId)
    if (existingScheduledAt) {
        const existingMs = new Date(existingScheduledAt).getTime()
        const targetMs = new Date(targetAt).getTime()
        if (existingMs <= targetMs + 2000) return
    }

    await setPublishScheduledAt(env, projectId, targetAt)
    await env.SYNC_QUEUE.send(
        { kind: "publish", projectId } satisfies QueueJobMessage,
        { delaySeconds }
    )
    console.log(`[publish ${projectId}] Trailing publish scheduled in ${delaySeconds}s`)
}

export async function rescheduleTrailingPublish(
    env: Env,
    projectId: string,
    delaySeconds: number
): Promise<void> {
    const delay = Math.max(MIN_PUBLISH_DELAY_SEC, delaySeconds)
    const targetAt = new Date(Date.now() + delay * 1000).toISOString()
    await setPublishScheduledAt(env, projectId, targetAt)
    await env.SYNC_QUEUE.send(
        { kind: "publish", projectId } satisfies QueueJobMessage,
        { delaySeconds: delay }
    )
}
