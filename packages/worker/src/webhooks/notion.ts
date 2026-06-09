import {
    findProjectsByNotionSource,
    getNotionWebhookVerificationToken,
    markAutoSyncWebhooksActive,
    saveIntegrationWebhookToken,
    scheduleDebounceSync,
    updateWebhookStatus,
} from "../db.js"
import type { Env } from "../env.js"
import { verifyNotionWebhookSignature } from "./notion-signature.js"

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
    signature: string | undefined
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

        const projects = await env.DB.prepare(`SELECT id FROM projects`).all<{ id: string }>()
        for (const row of projects.results ?? []) {
            await updateWebhookStatus(env, row.id, "awaiting_verification")
        }

        console.log(
            "\n========== NOTION WEBHOOK VERIFICATION ==========\n" +
                "verification_token received (stored for signature verification).\n" +
                "Paste this token in Notion → Integration → Webhooks → Verify subscription.\n" +
                "Check the project dashboard or worker logs for the token value.\n" +
                "=================================================\n"
        )
        console.log(`verification_token: ${token}`)

        return {
            response: new Response(JSON.stringify({ ok: true }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            }),
            projectIdsToSync: [],
        }
    }

    const verificationToken = await getNotionWebhookVerificationToken(env)
    if (!verificationToken) {
        console.warn("Notion webhook rejected: verification token not configured yet")
        return {
            response: new Response("Webhook verification not configured", { status: 401 }),
            projectIdsToSync: [],
        }
    }

    const signatureValid = await verifyNotionWebhookSignature(verificationToken, rawBody, signature)
    if (!signatureValid) {
        console.warn("Notion webhook rejected: invalid X-Notion-Signature")
        return {
            response: new Response("Invalid signature", { status: 401 }),
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
        await markAutoSyncWebhooksActive(env, ids)
        console.log(`Notion webhook matched ${ids.length} project(s):`, ids.join(", "))
    } else {
        await markAutoSyncWebhooksActive(env)
        console.log("Notion webhook signature valid (no matching projects in payload)")
    }

    return {
        response: new Response(JSON.stringify({ received: true, projects: ids.length }), {
            headers: { "Content-Type": "application/json" },
        }),
        projectIdsToSync: ids,
    }
}
