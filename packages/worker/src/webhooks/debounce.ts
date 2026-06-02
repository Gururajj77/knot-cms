import {
    clearDebounce,
    getDebounceScheduledAt,
    WEBHOOK_DEBOUNCE_MS,
} from "../db.js"
import type { Env } from "../env.js"

/** Safety cap so a stuck row cannot block waitUntil forever. */
const MAX_DEBOUNCE_WAIT_MS = WEBHOOK_DEBOUNCE_MS + 60_000

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Wait until no new webhook has extended the debounce window (scheduled_at in the past).
 * Each incoming event pushes scheduled_at forward by WEBHOOK_DEBOUNCE_MS.
 */
export async function waitForDebounceQuiet(env: Env, projectId: string): Promise<void> {
    const deadline = Date.now() + MAX_DEBOUNCE_WAIT_MS

    while (Date.now() < deadline) {
        const scheduledAt = await getDebounceScheduledAt(env, projectId)
        if (!scheduledAt) return

        const remaining = new Date(scheduledAt).getTime() - Date.now()
        if (remaining <= 0) return

        await sleep(Math.min(remaining, 500))
    }
}

/** Run sync after the quiet window; clears debounce so cron does not double-sync. */
export async function finishDebounceAndClear(env: Env, projectId: string): Promise<void> {
    await waitForDebounceQuiet(env, projectId)
    await clearDebounce(env, projectId)
}
