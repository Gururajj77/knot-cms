import {
    DashboardCreateProjectSchema,
    DeleteProjectSchema,
    getDataSourceProperties,
    searchDataSources,
    UpdatePublishSettingsSchema,
    VerifyFramerCredentialsSchema,
} from "@notion-framer/shared"
import type { SessionPayload } from "@notion-framer/shared"
import { Hono } from "hono"
import type { Context, MiddlewareHandler } from "hono"
import { isAuthDevAllowAny } from "../auth/google-config.js"
import { readSession } from "../auth/middleware.js"
import {
    createOrUpdateProject,
    createSetupSession,
    ensureDevCustomer,
    getCustomerByEmail,
    getCustomerById,
    getNotionWebhookVerificationToken,
    getProjectForCustomer,
    getProjectStatus,
    getSetupSessionToken,
    isCustomerEntitled,
    listProjectsByCustomerId,
    markAutoSyncWebhooksActive,
    updateProjectPublishSettings,
} from "../db.js"
import type { Env } from "../env.js"
import { apiErrorFromUnknown } from "../lib/apiError.js"
import { allowRateLimitedAction } from "../lib/rateLimit.js"
import { buildNotionAuthorizeUrl } from "../lib/notion-oauth-url.js"
import { probeNotionOAuthCredentials } from "../lib/notion-token-exchange.js"
import { getNotionRedirectUri } from "../lib/public-origin.js"
import { getNotionOAuthSetupError } from "../notion-config.js"
import { deleteProject } from "../projects/deleteProject.js"
import { runSync } from "../sync/runSync.js"
import { verifyFramerCredentials } from "../sync/verifyFramerCredentials.js"
import { registerNotionWebhook } from "../webhooks/notion.js"

type DashboardVars = {
    session: SessionPayload
    customerId: string | null
}

type DashboardContext = Context<{ Bindings: Env; Variables: DashboardVars }>

export const dashboard = new Hono<{ Bindings: Env; Variables: DashboardVars }>()

async function resolveCustomerId(
    env: Env,
    session: SessionPayload,
    customer: Awaited<ReturnType<typeof getCustomerByEmail>>,
    devBypass: boolean
): Promise<string | null> {
    if (session.sub.startsWith("dev:")) return null
    if (customer?.id) return customer.id
    if (devBypass) return ensureDevCustomer(env, session.email)
    return null
}

/** Always enforce project ownership — never skip when customerId is missing. */
async function requireOwnedProject(c: DashboardContext, projectId: string): Promise<Response | null> {
    const customerId = c.get("customerId")
    if (!customerId) {
        return c.json({ error: "Project not found" }, 404)
    }

    const owned = await getProjectForCustomer(c.env, projectId, customerId)
    if (!owned) {
        return c.json({ error: "Project not found" }, 404)
    }

    return null
}

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

    const customerId = await resolveCustomerId(c.env, session, customer, devBypass)
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

dashboard.post("/framer/verify", async c => {
    const session = c.get("session")
    const rateKey = `framer-verify:${c.get("customerId") ?? session.email}`
    if (!allowRateLimitedAction(rateKey, 10, 60_000)) {
        return c.json({ error: "Too many attempts. Wait a minute and try again." }, 429)
    }

    const parsed = VerifyFramerCredentialsSchema.safeParse(await c.req.json())
    if (!parsed.success) {
        return c.json({ error: parsed.error.flatten() }, 400)
    }

    try {
        await verifyFramerCredentials(parsed.data.framerProjectUrl, parsed.data.framerApiKey)
        return c.json({ ok: true })
    } catch (error) {
        const body = apiErrorFromUnknown(error)
        const status = body.code === "FRAMER_UNAUTHORIZED" || body.code === "FRAMER_COLLECTION" ? 400 : 500
        return c.json(body, status)
    }
})

dashboard.post("/projects", async c => {
    const body = await c.req.json()
    const parsed = DashboardCreateProjectSchema.safeParse(body)
    if (!parsed.success) {
        return c.json({ error: parsed.error.flatten() }, 400)
    }

    const customerId = c.get("customerId")
    if (!customerId) {
        return c.json({ error: "Customer account required" }, 403)
    }

    let projectId: string
    try {
        projectId = await createOrUpdateProject(c.env, parsed.data, { customerId })
    } catch (error) {
        const apiError = apiErrorFromUnknown(error)
        const status =
            apiError.code === "FRAMER_UNAUTHORIZED" || apiError.code === "FRAMER_COLLECTION" ? 400 : 500
        return c.json(apiError, status)
    }

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
    const projectId = c.req.param("id")
    const denied = await requireOwnedProject(c, projectId)
    if (denied) return denied

    const status = await getProjectStatus(c.env, projectId)
    if (!status) {
        return c.json({ error: "Project not found" }, 404)
    }

    return c.json(status)
})

dashboard.post("/projects/:id/webhook/confirm", async c => {
    const projectId = c.req.param("id")
    const denied = await requireOwnedProject(c, projectId)
    if (denied) return denied

    const token = await getNotionWebhookVerificationToken(c.env)
    if (!token) {
        return c.json(
            { error: "No verification token received yet. Re-add the webhook URL in Notion first." },
            400
        )
    }

    await markAutoSyncWebhooksActive(c.env)

    const status = await getProjectStatus(c.env, projectId)
    if (!status) {
        return c.json({ error: "Project not found" }, 404)
    }

    return c.json(status)
})

dashboard.post("/projects/:id/sync", async c => {
    const projectId = c.req.param("id")
    const denied = await requireOwnedProject(c, projectId)
    if (denied) return denied

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
    const projectId = c.req.param("id")
    const denied = await requireOwnedProject(c, projectId)
    if (denied) return denied

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
    const projectId = c.req.param("id")
    const denied = await requireOwnedProject(c, projectId)
    if (denied) return denied

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
