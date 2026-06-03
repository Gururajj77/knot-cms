import {
    getLastPublishAt,
    publishCooldownRemainingMs,
    recordLastPublishAt,
} from "../db.js"
import type { Env } from "../env.js"
import { publishIfEnabled } from "./framerCollection.js"
import type { connect } from "framer-api"

type FramerClient = Awaited<ReturnType<typeof connect>>

export type PublishAfterSyncResult = {
    published: boolean
    deployed: boolean
    publishSkipped?: boolean
    publishSkipReason?: string
}

/**
 * Publish after CMS sync without failing the sync.
 * Skips if within cooldown since last successful publish, or if Framer rejects publish.
 */
export async function publishAfterSync(
    env: Env,
    projectId: string,
    framer: FramerClient,
    autoPublish: boolean,
    publishMode: string
): Promise<PublishAfterSyncResult> {
    if (!autoPublish) {
        return { published: false, deployed: false }
    }

    const lastPublishAt = await getLastPublishAt(env, projectId)
    if (lastPublishAt) {
        const remainingMs = publishCooldownRemainingMs(lastPublishAt, publishMode)
        if (remainingMs > 0) {
            const waitSec = Math.ceil(remainingMs / 1000)
            const reason = `Publish cooldown (${waitSec}s remaining — CMS still synced)`
            console.log(`[sync ${projectId}] ${reason}`)
            return {
                published: false,
                deployed: false,
                publishSkipped: true,
                publishSkipReason: reason,
            }
        }
    }

    try {
        const result = await publishIfEnabled(framer, true, publishMode)
        await recordLastPublishAt(env, projectId, new Date().toISOString())
        return result
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.warn(`[sync ${projectId}] Publish skipped (CMS synced): ${message}`)
        return {
            published: false,
            deployed: false,
            publishSkipped: true,
            publishSkipReason: message.slice(0, 240),
        }
    }
}
