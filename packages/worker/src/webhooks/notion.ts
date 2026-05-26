import {
    clearDebounce,
    findProjectsByNotionSource,
    getDueDebounceProjects,
    saveIntegrationWebhookToken,
    scheduleDebounceSync,
    updateWebhookStatus,
} from "../db.js"
import type { Env } from "../env.js"
import { runSync } from "../sync/runSync.js"

export type WebhookHandleResult = {
    response: Response
    projectIdsToSync: string[]
}

function extractNotionSourceId(event: Record<string, unknown>): string | null {
    const data = event.data as Record<string, unknown> | undefined
    if (!data) return null

    const parent = data.parent as Record<string, unknown> | undefined
    if (parent) {
        if (typeof parent.data_source_id === "string") return parent.data_source_id
        if (typeof parent.database_id === "string") return parent.database_id
    }

    if (typeof data.data_source_id === "string") return data.data_source_id
    if (typeof data.database_id === "string") return data.database_id

    return null
}

export async function registerNotionWebhook(env: Env, projectId: string): Promise<void> {
    await updateWebhookStatus(env, projectId, "awaiting_verification")
}

export async function handleNotionWebhook(
    env: Env,
    rawBody: string,
    _signature: string | undefined
): Promise<WebhookHandleResult> {
    let payload: Record<string, unknown>
    try {
        payload = JSON.parse(rawBody) as Record<string, unknown>
    } catch {
        return {
            response: new Response("Invalid JSON", { status: 400 }),
            projectIdsToSync: [],
        }
    }

    if (payload.verification_token && typeof payload.verification_token === "string") {
        const token = payload.verification_token
        await saveIntegrationWebhookToken(env, token)
        console.log(
            "\n========== NOTION WEBHOOK VERIFICATION ==========\n" +
                `verification_token: ${token}\n` +
                "Paste this token in Notion → Integration → Webhooks → Verify subscription.\n" +
                "=================================================\n"
        )
        return {
            response: new Response(JSON.stringify({ ok: true }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            }),
            projectIdsToSync: [],
        }
    }

    const events = Array.isArray(payload.events) ? payload.events : [payload]
    const projectIds = new Set<string>()

    for (const event of events) {
        const sourceId = extractNotionSourceId(event as Record<string, unknown>)
        if (!sourceId) {
            console.warn("Notion webhook event without data_source_id/database_id", JSON.stringify(event))
            continue
        }

        const projects = await findProjectsByNotionSource(env, sourceId)
        for (const project of projects) {
            projectIds.add(project.id)
            await scheduleDebounceSync(env, project.id)
        }
    }

    const ids = [...projectIds]
    if (ids.length > 0) {
        console.log(`Notion webhook matched ${ids.length} project(s):`, ids.join(", "))
    }

    return {
        response: new Response(JSON.stringify({ received: true, projects: ids.length }), {
            headers: { "Content-Type": "application/json" },
        }),
        projectIdsToSync: ids,
    }
}

/** Run sync for projects (called from waitUntil — do not rely on cron in local dev). */
export async function runImmediateSyncs(env: Env, projectIds: string[]): Promise<void> {
    await sleep(3000)

    for (const projectId of projectIds) {
        await clearDebounce(env, projectId)
        try {
            const row = await env.DB.prepare(
                `SELECT auto_sync, license_status FROM projects WHERE id = ?`
            )
                .bind(projectId)
                .first<{ auto_sync: number; license_status: string }>()

            if (!row || row.auto_sync !== 1 || row.license_status !== "active") {
                console.log(`Skipping sync for ${projectId} (auto_sync or license)`)
                continue
            }

            const result = await runSync(env, projectId)
            await updateWebhookStatus(env, projectId, "active")
            console.log(
                `Auto-sync OK ${projectId}: ${result.itemsSynced} items, published=${result.published}`
            )
        } catch (error) {
            console.error(`Auto-sync failed for ${projectId}:`, error)
        }
    }
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export async function processDebouncedSyncs(env: Env): Promise<void> {
    const projectIds = await getDueDebounceProjects(env)
    await runImmediateSyncs(env, projectIds)
}
