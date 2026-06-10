import { Hono } from "hono"
import { authRoutes } from "./routes/auth.js"
import { dashboard } from "./routes/dashboard.js"
import { pluginRoutes } from "./routes/plugin.js"
import { notionOAuth } from "./oauth/notion.js"
import { googleOAuth } from "./oauth/google.js"
import { handleNotionWebhook } from "./webhooks/notion.js"
import { handleBillingWebhook } from "./webhooks/billing.js"
import { enqueueSyncJobs, processSyncQueueMessage, type SyncJobMessage } from "./sync/syncQueue.js"
import type { Env } from "./env.js"

const app = new Hono<{ Bindings: Env }>()

app.get("/health", c => c.json({ ok: true }))

app.route("/oauth/notion", notionOAuth)
app.route("/auth/google", googleOAuth)
app.route("/api/auth", authRoutes)
app.route("/api/dashboard", dashboard)
app.route("/api/plugin", pluginRoutes)

app.get("*", async c => {
    if (c.req.method !== "GET" || !c.env.ASSETS) {
        return c.notFound()
    }

    const path = new URL(c.req.url).pathname
    if (
        path.startsWith("/api") ||
        path.startsWith("/auth") ||
        path.startsWith("/oauth") ||
        path.startsWith("/webhooks") ||
        path === "/health"
    ) {
        return c.notFound()
    }

    return c.env.ASSETS.fetch(c.req.raw)
})

/** Browsers use GET — Notion verification uses POST only. */
app.get("/webhooks/notion", c =>
    c.json({
        ok: true,
        message:
            "Webhook endpoint is live. Notion verifies via POST (not browser). After creating the subscription, copy verification_token from worker logs and paste it in Notion → Verify.",
    })
)

app.get("/webhooks/billing", c =>
    c.json({
        ok: true,
        provider: c.env.BILLING_PROVIDER ?? null,
        message: "Billing webhook endpoint. Polar delivers subscription events via POST.",
    })
)

app.post("/webhooks/billing", async c => {
    const rawBody = await c.req.text()
    return handleBillingWebhook(c.env, rawBody, c.req.raw.headers)
})

app.post("/webhooks/notion", async c => {
    const rawBody = await c.req.text()
    const signature = c.req.header("X-Notion-Signature")
    const { response, projectIdsToSync } = await handleNotionWebhook(c.env, rawBody, signature)

    if (projectIdsToSync.length > 0) {
        await enqueueSyncJobs(c.env, projectIdsToSync)
    }

    return response
})

export default {
    fetch: app.fetch,
    /** No-op: legacy every-minute cron may still fire until triggers deploy clears it. */
    async scheduled(): Promise<void> {},
    async queue(batch: MessageBatch<SyncJobMessage>, env: Env): Promise<void> {
        for (const message of batch.messages) {
            try {
                const result = await processSyncQueueMessage(env, message.body)
                if (result.ack) {
                    message.ack()
                } else {
                    message.retry({ delaySeconds: result.delaySeconds })
                }
            } catch (error) {
                const detail = error instanceof Error ? error.message : String(error)
                console.error(`Sync queue handler error for ${message.body.projectId}:`, detail)
                message.retry({ delaySeconds: 60 })
            }
        }
    },
}
