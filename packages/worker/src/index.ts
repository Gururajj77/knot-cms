import { Hono } from "hono"
import { api } from "./routes/api.js"
import { authRoutes } from "./routes/auth.js"
import { notionOAuth } from "./oauth/notion.js"
import { googleOAuth } from "./oauth/google.js"
import {
    handleNotionWebhook,
    processDebouncedSyncs,
    runImmediateSyncs,
} from "./webhooks/notion.js"
import type { Env } from "./env.js"

const app = new Hono<{ Bindings: Env }>()

app.get("/health", c => c.json({ ok: true }))

app.route("/oauth/notion", notionOAuth)
app.route("/auth/google", googleOAuth)
app.route("/api/auth", authRoutes)
app.route("/api", api)

/** Browsers use GET — Notion verification uses POST only. */
app.get("/webhooks/notion", c =>
    c.json({
        ok: true,
        message:
            "Webhook endpoint is live. Notion verifies via POST (not browser). After creating the subscription, copy verification_token from worker logs and paste it in Notion → Verify.",
    })
)

app.post("/webhooks/notion", async c => {
    const rawBody = await c.req.text()
    const signature = c.req.header("X-Notion-Signature")
    const { response, projectIdsToSync } = await handleNotionWebhook(c.env, rawBody, signature)

    if (projectIdsToSync.length > 0) {
        c.executionCtx.waitUntil(runImmediateSyncs(c.env, projectIdsToSync))
    }

    return response
})

export default {
    fetch: app.fetch,
    async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
        ctx.waitUntil(processDebouncedSyncs(env))
    },
}
