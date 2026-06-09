import {
    DashboardCreateProjectSchema,
    DeleteProjectSchema,
    getDataSourceProperties,
    searchDataSources,
    UpdatePublishSettingsSchema,
} from "@notion-framer/shared"
import type { SessionPayload } from "@notion-framer/shared"
import { Hono } from "hono"
import type { MiddlewareHandler } from "hono"
import { isAuthDevAllowAny } from "../auth/google-config.js"
import { readSession } from "../auth/middleware.js"
import {
    createOrUpdateProject,
    createSetupSession,
    getCustomerByEmail,
    getCustomerById,
    getProjectForCustomer,
    getProjectStatus,
    getSetupSessionToken,
    isCustomerEntitled,
    listProjectsByCustomerId,
    updateProjectPublishSettings,
} from "../db.js"
import type { Env } from "../env.js"
import { apiErrorFromUnknown } from "../lib/apiError.js"
import { buildNotionAuthorizeUrl } from "../lib/notion-oauth-url.js"
import { probeNotionOAuthCredentials } from "../lib/notion-token-exchange.js"
import { getNotionRedirectUri } from "../lib/public-origin.js"
import { getNotionOAuthSetupError } from "../notion-config.js"
import { deleteProject } from "../projects/deleteProject.js"
import { runSync } from "../sync/runSync.js"
import { registerNotionWebhook } from "../webhooks/notion.js"

type DashboardVars = {
    session: SessionPayload
    customerId: string | null
}

export const dashboard = new Hono<{ Bindings: Env; Variables: DashboardVars }>()

const requireDashboardSession: MiddlewareHandler<{
    Bindings: Env
    Variables: DashboardVars
}> = async (c, next) => {
    const session = await readSession(c.env, c.req.header("Cookie"))
    if (!session) {
        return c.json({ error: "Unauthorized" }, 401)
    }

    const devBypass = isAuthDevAllowAny(c.env)
    const customer = session.sub.startsWith("dev:")
        ? null
        : session.sub.startsWith("acct:")
          ? await getCustomerByEmail(c.env, session.email)
          : ((await getCustomerById(c.env, session.sub)) ??
            (await getCustomerByEmail(c.env, session.email)))

    if (!devBypass && !isCustomerEntitled(customer)) {
        return c.json(
            {
                error: "Active subscription required",
                checkoutUrl: c.env.BILLING_CHECKOUT_URL ?? null,
            },
            403
        )
    }

    const customerId = session.sub.startsWith("dev:") ? null : (customer?.id ?? null)
    c.set("session", session)
    c.set("customerId", customerId)
    await next()
}

dashboard.use("*", requireDashboardSession)

dashboard.get("/projects", async c => {
    const customerId = c.get("customerId")
    if (!customerId) {
        return c.json({ projects: [] })
    }

    const projects = await listProjectsByCustomerId(c.env, customerId)
    return c.json({ projects })
})

dashboard.post("/setup-sessions", async c => {
    const configError = getNotionOAuthSetupError(c.env)
    if (configError) {
        return c.json({ error: configError }, 503)
    }

    const id = await createSetupSession(c.env)
    const redirectUri = getNotionRedirectUri(c.env, c.req.url)
    const oauthUrl = buildNotionAuthorizeUrl(c.env, c.req.url, id)
    const credentialWarning = await probeNotionOAuthCredentials(c.env, redirectUri)
    return c.json({ setupSessionId: id, oauthUrl, credentialWarning })
})

dashboard.get("/setup-sessions/:id/data-sources", async c => {
    const token = await getSetupSessionToken(c.env, c.req.param("id"))
    if (!token) {
        return c.json({ error: "Session expired. Reconnect Notion." }, 401)
    }
    const sources = await searchDataSources(token)
    return c.json({ dataSources: sources })
})

dashboard.get("/setup-sessions/:id/data-sources/:dataSourceId/properties", async c => {
    const token = await getSetupSessionToken(c.env, c.req.param("id"))
    if (!token) {
        return c.json({ error: "Session expired. Reconnect Notion." }, 401)
    }
    const properties = await getDataSourceProperties(token, c.req.param("dataSourceId"))
    return c.json({ properties })
})

dashboard.post("/projects", async c => {
    const body = await c.req.json()
    const parsed = DashboardCreateProjectSchema.safeParse(body)
    if (!parsed.success) {
        return c.json({ error: parsed.error.flatten() }, 400)
    }

    const customerId = c.get("customerId")
    const projectId = await createOrUpdateProject(c.env, parsed.data, { customerId })

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

dashboard.get("/projects/:id", async c => {
    const customerId = c.get("customerId")
    const projectId = c.req.param("id")

    if (customerId) {
        const owned = await getProjectForCustomer(c.env, projectId, customerId)
        if (!owned) {
            return c.json({ error: "Project not found" }, 404)
        }
    }

    const status = await getProjectStatus(c.env, projectId)
    if (!status) {
        return c.json({ error: "Project not found" }, 404)
    }

    return c.json(status)
})

dashboard.post("/projects/:id/sync", async c => {
    const customerId = c.get("customerId")
    const projectId = c.req.param("id")

    if (customerId) {
        const owned = await getProjectForCustomer(c.env, projectId, customerId)
        if (!owned) {
            return c.json({ error: "Project not found" }, 404)
        }
    }

    try {
        const result = await runSync(c.env, projectId)
        return c.json(result)
    } catch (error) {
        const body = apiErrorFromUnknown(error)
        const status =
            body.code === "LICENSE_INACTIVE"
                ? 403
                : body.code === "SYNC_IN_PROGRESS"
                  ? 409
                  : 500
        return c.json(body, status)
    }
})

dashboard.delete("/projects/:id", async c => {
    const customerId = c.get("customerId")
    const projectId = c.req.param("id")

    if (customerId) {
        const owned = await getProjectForCustomer(c.env, projectId, customerId)
        if (!owned) {
            return c.json({ error: "Project not found" }, 404)
        }
    }

    const parsed = DeleteProjectSchema.safeParse(await c.req.json().catch(() => ({})))
    if (!parsed.success) {
        return c.json({ error: parsed.error.flatten() }, 400)
    }

    try {
        const result = await deleteProject(c.env, projectId, {
            deleteFramerCollection: parsed.data.deleteFramerCollection,
        })
        if (!result) {
            return c.json({ error: "Project not found" }, 404)
        }
        return c.json(result)
    } catch (error) {
        const body = apiErrorFromUnknown(error)
        return c.json(body, 500)
    }
})

dashboard.patch("/projects/:id/publish", async c => {
    const customerId = c.get("customerId")
    const projectId = c.req.param("id")

    if (customerId) {
        const owned = await getProjectForCustomer(c.env, projectId, customerId)
        if (!owned) {
            return c.json({ error: "Project not found" }, 404)
        }
    }

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
