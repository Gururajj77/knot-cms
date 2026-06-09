import {
    CreateProjectSchema,
    getDataSourceProperties,
    LicenseVerifySchema,
    searchDataSources,
    UpdatePublishSettingsSchema,
    verifyLicenseKey,
} from "@notion-framer/shared"
import { Hono } from "hono"
import { cors } from "hono/cors"
import {
    createOrUpdateProject,
    createSetupSession,
    getProjectStatus,
    updateProjectPublishSettings,
    updateSyncState,
    getSetupSessionToken,
} from "../db.js"
import { apiErrorFromUnknown, jsonApiError } from "../lib/apiError.js"
import { buildNotionAuthorizeUrl } from "../lib/notion-oauth-url.js"
import { buildProjectSyncPayload } from "../sync/buildPayload.js"
import { runSync } from "../sync/runSync.js"
import type { Env } from "../env.js"
import { getNotionOAuthSetupError } from "../notion-config.js"
import { registerNotionWebhook } from "../webhooks/notion.js"

export const api = new Hono<{ Bindings: Env }>()

api.use(
    "/*",
    cors({
        origin: "*",
        allowMethods: ["GET", "POST", "PATCH", "OPTIONS"],
        allowHeaders: ["Content-Type"],
    })
)

api.post("/setup-sessions", async c => {
    const configError = getNotionOAuthSetupError(c.env)
    if (configError) {
        return c.json({ error: configError }, 503)
    }

    const id = await createSetupSession(c.env)
    const oauthUrl = buildNotionAuthorizeUrl(c.env, c.req.url, id)
    return c.json({ setupSessionId: id, oauthUrl })
})

api.get("/setup-sessions/:id/data-sources", async c => {
    const token = await getSetupSessionToken(c.env, c.req.param("id"))
    if (!token) {
        return c.json({ error: "Session expired. Reconnect Notion." }, 401)
    }
    const sources = await searchDataSources(token)
    return c.json({ dataSources: sources })
})

api.get("/setup-sessions/:id/data-sources/:dataSourceId/properties", async c => {
    const token = await getSetupSessionToken(c.env, c.req.param("id"))
    if (!token) {
        return c.json({ error: "Session expired. Reconnect Notion." }, 401)
    }
    const properties = await getDataSourceProperties(token, c.req.param("dataSourceId"))
    return c.json({ properties })
})

api.post("/license/verify", async c => {
    const parsed = LicenseVerifySchema.safeParse(await c.req.json())
    if (!parsed.success) {
        return c.json({ error: parsed.error.flatten() }, 400)
    }

    const result = await verifyLicenseKey(
        c.env.LICENSE_SIGNING_SECRET,
        parsed.data.licenseKey,
        parsed.data.framerProjectUrl
    )

    return c.json({
        valid: result.valid,
        reason: result.reason,
    })
})

api.post("/projects", async c => {
    const body = await c.req.json()
    const parsed = CreateProjectSchema.safeParse(body)
    if (!parsed.success) {
        return c.json({ error: parsed.error.flatten() }, 400)
    }

    const license = await verifyLicenseKey(
        c.env.LICENSE_SIGNING_SECRET,
        parsed.data.licenseKey,
        parsed.data.framerProjectUrl
    )
    if (!license.valid) {
        return c.json({ error: license.reason ?? "Invalid license" }, 403)
    }

    const projectId = await createOrUpdateProject(c.env, parsed.data)

    try {
        await registerNotionWebhook(c.env, projectId)
    } catch (webhookError) {
        console.warn("Webhook registration failed:", webhookError)
    }

    let sync = null
    let syncError = undefined
    try {
        sync = await runSync(c.env, projectId)
    } catch (syncErr) {
        syncError = apiErrorFromUnknown(syncErr)
        console.error("Initial sync failed:", syncError.code, syncError.error)
    }

    return c.json({ projectId, sync, syncError })
})

api.get("/projects/:id", async c => {
    const status = await getProjectStatus(c.env, c.req.param("id"))
    if (!status) {
        return c.json({ error: "Project not found" }, 404)
    }
    return c.json(status)
})

api.post("/projects/:id/sync-complete", async c => {
    const projectId = c.req.param("id")
    const body = (await c.req.json()) as { itemsSynced?: number }
    await updateSyncState(c.env, projectId, {
        lastSyncAt: new Date().toISOString(),
        lastError: null,
        itemsSyncedCount: body.itemsSynced ?? 0,
    })
    return c.json({ ok: true })
})

api.get("/projects/:id/sync-payload", async c => {
    const projectId = c.req.param("id")
    try {
        const { payload } = await buildProjectSyncPayload(c.env, projectId)
        return c.json(payload)
    } catch (error) {
        const body = apiErrorFromUnknown(error)
        const status = body.code === "LICENSE_INACTIVE" ? 403 : 500
        return c.json(body, status)
    }
})

api.patch("/projects/:id/publish", async c => {
    const projectId = c.req.param("id")
    const parsed = UpdatePublishSettingsSchema.safeParse(await c.req.json())
    if (!parsed.success) {
        return c.json({ error: parsed.error.flatten() }, 400)
    }

    const publishMode =
        parsed.data.publishMode ?? (parsed.data.autoPublish ? "deploy_live" : undefined)

    const status = await updateProjectPublishSettings(c.env, projectId, {
        autoPublish: parsed.data.autoPublish,
        publishMode,
    })

    if (!status) {
        return c.json({ error: "Project not found" }, 404)
    }

    return c.json(status)
})

api.post("/projects/:id/sync", async c => {
    const projectId = c.req.param("id")
    try {
        const result = await runSync(c.env, projectId)
        return c.json(result)
    } catch (error) {
        const body = apiErrorFromUnknown(error)
        console.error("Sync failed:", body.code, body.error)
        const status =
            body.code === "LICENSE_INACTIVE"
                ? 403
                : body.code === "SYNC_IN_PROGRESS"
                  ? 409
                  : 500
        return c.json(body, status)
    }
})

api.post("/projects/:id/license", async c => {
    const body = (await c.req.json()) as { licenseKey?: string; framerProjectUrl?: string }
    if (!body.licenseKey || !body.framerProjectUrl) {
        return c.json({ error: "licenseKey and framerProjectUrl required" }, 400)
    }

    const result = await verifyLicenseKey(
        c.env.LICENSE_SIGNING_SECRET,
        body.licenseKey,
        body.framerProjectUrl
    )

    return c.json(result)
})
