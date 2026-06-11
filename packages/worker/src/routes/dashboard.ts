import {
    BootstrapNotionDatabaseSchema,
    DashboardCreateProjectSchema,
    DeleteProjectSchema,
    getDataSourceProperties,
    ListFramerCollectionsSchema,
    searchDataSources,
    searchNotionPages,
    SearchNotionPagesSchema,
    UpdateAutomationSettingsSchema,
    UpdatePublishSettingsSchema,
    VerifyFramerCredentialsSchema,
} from "@knotcms/shared"
import type { SessionPayload } from "@knotcms/shared"
import { Hono } from "hono"
import type { Context, MiddlewareHandler } from "hono"
import type { ContentfulStatusCode } from "hono/utils/http-status"
import { isAuthDevAllowAny } from "../auth/google-config.js"
import { readSession } from "../auth/middleware.js"
import {
    createOrUpdateProject,
    createSetupSession,
    ensureCustomerForEmail,
    ensureDevCustomer,
    findProjectByFramerAndNotionSource,
    getCustomerByEmail,
    getCustomerById,
    getNotionWebhookVerificationToken,
    getProjectForCustomer,
    getProjectStatus,
    getSetupSessionToken,
    isCustomerEntitled,
    listProjectsByCustomerId,
    ensureWebhookSubscription,
    markAutoSyncWebhooksActive,
    updateProjectAutomationSettings,
    updateProjectPublishSettings,
} from "../db.js"
import type { CustomerRow } from "../db/customers.js"
import type { Env } from "../env.js"
import { apiErrorFromUnknown } from "../lib/apiError.js"
import { primaryBillingCheckoutUrl, resolveBillingCheckoutUrls } from "../lib/billing-checkout.js"
import {
    assertPlanFeature,
    assertProjectLimit,
    assertSyncQuota,
    assertWithinProjectUsageLimit,
} from "../lib/entitlements.js"
import { checkPlanRateLimit } from "../lib/rateLimit.js"
import { buildNotionAuthorizeUrl } from "../lib/notion-oauth-url.js"
import { probeNotionOAuthCredentials } from "../lib/notion-token-exchange.js"
import { getNotionRedirectUri } from "../lib/public-origin.js"
import { getNotionOAuthSetupError } from "../notion-config.js"
import { deleteProject } from "../projects/deleteProject.js"
import { runSync } from "../sync/runSync.js"
import { bootstrapNotionDatabase } from "../sync/bootstrapNotionDatabase.js"
import { listFramerCollections } from "../sync/listFramerCollections.js"
import { verifyFramerCredentials } from "../sync/verifyFramerCredentials.js"
import { registerNotionWebhook } from "../webhooks/notion.js"

type DashboardVars = {
    session: SessionPayload
    customerId: string | null
    customer: CustomerRow | null
}

type DashboardContext = Context<{ Bindings: Env; Variables: DashboardVars }>

export const dashboard = new Hono<{ Bindings: Env; Variables: DashboardVars }>()

async function resolveCustomerId(
    env: Env,
    session: SessionPayload,
    customer: CustomerRow | null,
    devBypass: boolean
): Promise<string | null> {
    if (session.sub.startsWith("dev:")) return null
    if (customer?.id) return customer.id
    if (devBypass) return ensureDevCustomer(env, session.email)
    return (await ensureCustomerForEmail(env, session.email)).id
}

function syncErrorStatus(code: string): ContentfulStatusCode {
    if (code === "LICENSE_INACTIVE" || code === "PLAN_LIMIT") return 403
    if (code === "SYNC_IN_PROGRESS") return 409
    if (code === "FRAMER_UNAUTHORIZED" || code === "FRAMER_COLLECTION") return 400
    return 500
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
    let customer: CustomerRow | null = session.sub.startsWith("dev:")
        ? null
        : ((await getCustomerById(c.env, session.sub)) ??
          (await getCustomerByEmail(c.env, session.email)))

    if (!customer && !session.sub.startsWith("dev:")) {
        customer = await ensureCustomerForEmail(c.env, session.email)
    }

    if (!devBypass && !isCustomerEntitled(customer)) {
        return c.json(
            {
                error: "Active subscription required",
                checkoutUrl: primaryBillingCheckoutUrl(resolveBillingCheckoutUrls(c.env)),
                checkoutUrls: resolveBillingCheckoutUrls(c.env),
            },
            403
        )
    }

    const customerId = await resolveCustomerId(c.env, session, customer, devBypass)
    if (customerId && !customer) {
        customer = await getCustomerById(c.env, customerId)
    }
    c.set("session", session)
    c.set("customerId", customerId)
    c.set("customer", customer)
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

    const session = c.get("session")
    const customer = c.get("customer")
    const rateKey = c.get("customerId") ?? session.email
    if (!(await checkPlanRateLimit(c.env, customer, "setupSession", rateKey))) {
        return c.json({ error: "Too many setup attempts. Wait a minute and try again." }, 429)
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

dashboard.post("/setup/notion/search-pages", async c => {
    const parsed = SearchNotionPagesSchema.safeParse(await c.req.json())
    if (!parsed.success) {
        return c.json({ error: parsed.error.flatten() }, 400)
    }

    const token = await getSetupSessionToken(c.env, parsed.data.setupSessionId)
    if (!token) {
        return c.json({ error: "Session expired. Reconnect Notion." }, 401)
    }

    try {
        const pages = await searchNotionPages(token, parsed.data.query ?? "")
        return c.json({ pages })
    } catch (error) {
        const body = apiErrorFromUnknown(error)
        return c.json(body, 500)
    }
})

dashboard.post("/setup/notion/bootstrap-database", async c => {
    const session = c.get("session")
    const rateKey = c.get("customerId") ?? session.email
    if (!(await checkPlanRateLimit(c.env, c.get("customer"), "createProject", rateKey))) {
        return c.json({ error: "Too many requests. Wait a minute and try again." }, 429)
    }

    const parsed = BootstrapNotionDatabaseSchema.safeParse(await c.req.json())
    if (!parsed.success) {
        return c.json({ error: parsed.error.flatten() }, 400)
    }

    try {
        const result = await bootstrapNotionDatabase(c.env, parsed.data)
        return c.json(result)
    } catch (error) {
        const body = apiErrorFromUnknown(error)
        const status =
            body.code === "FRAMER_UNAUTHORIZED" ||
            body.code === "FRAMER_COLLECTION" ||
            body.error.includes("Session expired")
                ? 400
                : 500
        return c.json(body, status)
    }
})

dashboard.post("/setup/framer/collections", async c => {
    const session = c.get("session")
    const rateKey = c.get("customerId") ?? session.email
    if (!(await checkPlanRateLimit(c.env, c.get("customer"), "framerVerify", rateKey))) {
        return c.json({ error: "Too many attempts. Wait a minute and try again." }, 429)
    }

    const parsed = ListFramerCollectionsSchema.safeParse(await c.req.json())
    if (!parsed.success) {
        return c.json({ error: parsed.error.flatten() }, 400)
    }

    try {
        const collections = await listFramerCollections(
            parsed.data.framerProjectUrl,
            parsed.data.framerApiKey
        )
        return c.json({ collections })
    } catch (error) {
        const body = apiErrorFromUnknown(error)
        const status = body.code === "FRAMER_UNAUTHORIZED" || body.code === "FRAMER_COLLECTION" ? 400 : 500
        return c.json(body, status)
    }
})

dashboard.post("/framer/verify", async c => {
    const session = c.get("session")
    const rateKey = c.get("customerId") ?? session.email
    if (!(await checkPlanRateLimit(c.env, c.get("customer"), "framerVerify", rateKey))) {
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
    const customer = c.get("customer")
    if (!customerId || !customer) {
        return c.json({ error: "Customer account required" }, 403)
    }

    if (!(await checkPlanRateLimit(c.env, customer, "createProject", customerId))) {
        return c.json({ error: "Too many project requests. Wait a minute and try again." }, 429)
    }

    try {
        const existing = await findProjectByFramerAndNotionSource(
            c.env,
            parsed.data.framerProjectUrl,
            parsed.data.notionDataSourceId
        )
        if (!existing) {
            await assertProjectLimit(c.env, customer)
        }
        if (parsed.data.autoSync) {
            assertPlanFeature(customer, "autoSync")
        }
        if (parsed.data.autoPublish) {
            assertPlanFeature(customer, "autoPublish")
        }
        await assertSyncQuota(customer)
    } catch (error) {
        const apiError = apiErrorFromUnknown(error)
        return c.json(apiError, syncErrorStatus(apiError.code))
    }

    let projectId: string
    try {
        projectId = await createOrUpdateProject(c.env, parsed.data, { customerId })
    } catch (error) {
        const apiError = apiErrorFromUnknown(error)
        return c.json(apiError, syncErrorStatus(apiError.code))
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
        const raw =
            syncErr instanceof Error
                ? syncErr.message
                : typeof syncError.details?.raw === "string"
                  ? syncError.details.raw
                  : undefined
        console.error("Initial sync failed:", syncError.code, syncError.error, raw ?? "")
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

    const customer = c.get("customer")
    const rateKey = c.get("customerId") ?? c.get("session").email
    if (!(await checkPlanRateLimit(c.env, customer, "manualSync", rateKey))) {
        return c.json({ error: "Too many sync requests. Wait a minute and try again." }, 429)
    }

    try {
        const result = await runSync(c.env, projectId)
        return c.json(result)
    } catch (error) {
        const body = apiErrorFromUnknown(error)
        return c.json(body, syncErrorStatus(body.code))
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

dashboard.patch("/projects/:id/automation", async c => {
    const projectId = c.req.param("id")
    const denied = await requireOwnedProject(c, projectId)
    if (denied) return denied

    const parsed = UpdateAutomationSettingsSchema.safeParse(await c.req.json())
    if (!parsed.success) {
        return c.json({ error: parsed.error.flatten() }, 400)
    }

    const customer = c.get("customer")
    if (parsed.data.autoSync && customer) {
        try {
            await assertWithinProjectUsageLimit(c.env, customer)
            assertPlanFeature(customer, "autoSync")
        } catch (error) {
            const apiError = apiErrorFromUnknown(error)
            return c.json(apiError, syncErrorStatus(apiError.code))
        }
    }

    const status = await updateProjectAutomationSettings(c.env, projectId, parsed.data)
    if (!status) {
        return c.json({ error: "Project not found" }, 404)
    }

    if (parsed.data.autoSync) {
        await ensureWebhookSubscription(c.env, projectId)
        try {
            await registerNotionWebhook(c.env, projectId)
        } catch (webhookError) {
            console.warn("Webhook registration failed:", webhookError)
        }

        const token = await getNotionWebhookVerificationToken(c.env)
        if (token) {
            await markAutoSyncWebhooksActive(c.env, [projectId])
        }
    }

    const updated = await getProjectStatus(c.env, projectId)
    return c.json(updated ?? status)
})

dashboard.patch("/projects/:id/publish", async c => {
    const projectId = c.req.param("id")
    const denied = await requireOwnedProject(c, projectId)
    if (denied) return denied

    const parsed = UpdatePublishSettingsSchema.safeParse(await c.req.json())
    if (!parsed.success) {
        return c.json({ error: parsed.error.flatten() }, 400)
    }

    const customer = c.get("customer")
    if (parsed.data.autoPublish && customer) {
        try {
            await assertWithinProjectUsageLimit(c.env, customer)
            assertPlanFeature(customer, "autoPublish")
        } catch (error) {
            const apiError = apiErrorFromUnknown(error)
            return c.json(apiError, syncErrorStatus(apiError.code))
        }
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
