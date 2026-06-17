import type { Env } from "../env.js"
import {
    findProjectsBySpreadsheetId,
    getProjectSecrets,
    updateProjectSourceToken,
} from "../db.js"
import { resolveGoogleAccessToken } from "../lib/google-token.js"
import {
    isDriveWatchExpired,
    newDriveWatchChannel,
    registerDriveWatch,
} from "../lib/google-drive-watch.js"
import { scheduleDebounceSync } from "../db/sync-state.js"
import {
    getDriveWatchForProject,
    markDriveWatchPending,
    saveDriveWatchForProject,
    stageDriveWatchChannel,
} from "../db/drive-watch.js"

export async function ensureDriveWatchForProject(env: Env, projectId: string): Promise<void> {
    const project = await env.DB.prepare(`SELECT * FROM projects WHERE id = ?`)
        .bind(projectId)
        .first<{ id: string; source_data_source_id: string; source_provider: string }>()
    if (!project || project.source_provider !== "google_sheets") return

    const secrets = await getProjectSecrets(env, projectId)
    if (!secrets?.sourceToken) return

    const existing = await getDriveWatchForProject(env, projectId)
    if (existing && !isDriveWatchExpired(existing.watchExpiresAt) && existing.status === "active") {
        return
    }

    const { accessToken, updatedToken } = await resolveGoogleAccessToken(env, secrets.sourceToken)
    if (updatedToken) {
        await updateProjectSourceToken(env, projectId, updatedToken)
    }

    try {
        const channel = newDriveWatchChannel()
        await stageDriveWatchChannel(env, projectId, channel)
        const watch = await registerDriveWatch(
            env,
            accessToken,
            project.source_data_source_id,
            channel,
            {
                channelId: existing?.channelId ?? null,
                resourceId: existing?.resourceId ?? null,
            }
        )
        await saveDriveWatchForProject(env, projectId, watch)
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        if (
            message.includes("HTTPS webhook URL") ||
            message.includes("push.webhookUrlNotHttps") ||
            message.includes("WebHook callback must be HTTPS")
        ) {
            await markDriveWatchPending(env, projectId)
            console.warn(`Drive watch skipped for ${projectId}: ${message}`)
            return
        }
        throw error
    }
}

async function renewDriveWatchForProject(env: Env, projectId: string): Promise<void> {
    await ensureDriveWatchForProject(env, projectId)
}

export async function handleGoogleDriveWebhook(
    env: Env,
    headers: Headers
): Promise<{ response: Response; projectIdsToSync: string[] }> {
    const resourceState = headers.get("X-Goog-Resource-State") ?? ""
    const channelId = headers.get("X-Goog-Channel-ID")
    const channelToken = headers.get("X-Goog-Channel-Token")
    const resourceId = headers.get("X-Goog-Resource-ID")

    if (!channelId || !channelToken) {
        return { response: new Response("Missing channel headers", { status: 400 }), projectIdsToSync: [] }
    }

    const watchRow = await env.DB.prepare(
        `SELECT w.project_id, w.watch_resource_id, sec.source_webhook_verification_token, p.source_data_source_id
         FROM webhook_subscriptions w
         JOIN secrets sec ON sec.project_id = w.project_id
         JOIN projects p ON p.id = w.project_id
         WHERE w.source_subscription_id = ?`
    )
        .bind(channelId)
        .first<{
            project_id: string
            watch_resource_id: string | null
            source_webhook_verification_token: string | null
            source_data_source_id: string
        }>()

    if (!watchRow || watchRow.source_webhook_verification_token !== channelToken) {
        return { response: new Response("Unauthorized", { status: 401 }), projectIdsToSync: [] }
    }

    if (resourceId && watchRow.watch_resource_id && resourceId !== watchRow.watch_resource_id) {
        return { response: new Response("Resource mismatch", { status: 409 }), projectIdsToSync: [] }
    }

    if (resourceState === "sync") {
        // Google's channel verification ping — no sync job.
        return { response: new Response("OK", { status: 200 }), projectIdsToSync: [] }
    }

    const spreadsheetProjects = await findProjectsBySpreadsheetId(
        env,
        watchRow.source_data_source_id
    )

    const projectIdsToSync: string[] = []
    for (const project of spreadsheetProjects) {
        const shouldEnqueue = await scheduleDebounceSync(env, project.id)
        if (shouldEnqueue) {
            projectIdsToSync.push(project.id)
        }
        try {
            await renewDriveWatchForProject(env, project.id)
        } catch (error) {
            console.warn(`Drive watch renew failed for ${project.id}:`, error)
        }
    }

    return { response: new Response("OK", { status: 200 }), projectIdsToSync }
}
