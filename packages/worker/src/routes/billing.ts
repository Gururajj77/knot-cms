import { billingMerchantLabel } from "@knotcms/shared"
import { Hono } from "hono"
import { readSession } from "../auth/middleware.js"
import { ensureCustomerForEmail } from "../db/customers.js"
import type { Env } from "../env.js"
import { resolveBillingProvider } from "../lib/billing-config.js"
import { createBillingCheckout, parseCheckoutQuantity, usesBillingCheckoutApi } from "../lib/billing-checkout-api.js"
import { createBillingPortalSession, usesBillingPortalApi } from "../lib/billing-portal-api.js"
import { toUserFacingSeatChangeError, usesBillingSeatsApi } from "../lib/billing-seats-api.js"
import { completePendingCheckout, restartBillingWithSeats } from "../lib/billing-restart-api.js"
import { getPublicOrigin } from "../lib/public-origin.js"

function billingErrorStatus(message: string): 400 | 409 | 502 {
    if (message.includes("No subscription linked")) return 409
    if (message.includes("pending plan change") || message.includes("Pending plan change")) {
        return 409
    }
    if (message.includes("A pending plan change already exists")) return 409
    if (message.includes("Lowering seats on your current plan")) return 400
    return 502
}

export const billingRoutes = new Hono<{ Bindings: Env }>()

billingRoutes.get("/config", c => {
    const provider = resolveBillingProvider(c.env)
    return c.json({
        provider,
        merchantLabel: billingMerchantLabel(provider),
        checkoutUsesApi: usesBillingCheckoutApi(c.env),
        portalUsesApi: usesBillingPortalApi(c.env),
        seatsUsesApi: usesBillingSeatsApi(c.env),
    })
})

billingRoutes.post("/checkout", async c => {
    const session = await readSession(c.env, c.req.header("Cookie"))
    if (!session) {
        return c.json({ error: "Unauthorized" }, 401)
    }

    let body: { quantity?: unknown }
    try {
        body = await c.req.json()
    } catch {
        return c.json({ error: "Invalid JSON body" }, 400)
    }

    const quantity = parseCheckoutQuantity(body.quantity)
    if (quantity === null) {
        return c.json({ error: "quantity must be an integer between 1 and 100" }, 400)
    }

    const customer = await ensureCustomerForEmail(c.env, session.email)
    const returnUrl = `${getPublicOrigin(c.env, c.req.url)}/profile/plans?billing=success`

    try {
        const result = await createBillingCheckout(c.env, {
            email: session.email,
            customerId: customer.id,
            quantity,
            returnUrl,
        })
        return c.json({ url: result.url, sessionId: result.sessionId ?? null })
    } catch (error) {
        const message = error instanceof Error ? error.message : "Checkout failed"
        console.error("billing checkout error", error)
        return c.json({ error: message }, 502)
    }
})

billingRoutes.get("/portal", async c => {
    const session = await readSession(c.env, c.req.header("Cookie"))
    if (!session) {
        return c.json({ error: "Unauthorized" }, 401)
    }

    const customer = await ensureCustomerForEmail(c.env, session.email)
    const returnUrl = `${getPublicOrigin(c.env, c.req.url)}/profile/plans`

    try {
        const result = await createBillingPortalSession(c.env, {
            externalCustomerId: customer.external_customer_id,
            returnUrl,
        })
        return c.json({ url: result.url })
    } catch (error) {
        const message = error instanceof Error ? error.message : "Portal failed"
        const status = message.includes("No billing account linked") ? 409 : 502
        console.error("billing portal error", error)
        return c.json({ error: message }, status)
    }
})

billingRoutes.post("/restart-with-seats", async c => {
    const session = await readSession(c.env, c.req.header("Cookie"))
    if (!session) {
        return c.json({ error: "Unauthorized" }, 401)
    }

    let body: { quantity?: unknown; timing?: unknown }
    try {
        body = await c.req.json()
    } catch {
        return c.json({ error: "Invalid JSON body" }, 400)
    }

    const quantity = parseCheckoutQuantity(body.quantity)
    if (quantity === null) {
        return c.json({ error: "quantity must be an integer between 1 and 100" }, 400)
    }

    const timing = body.timing === "before_renewal" ? "before_renewal" : "now"

    const customer = await ensureCustomerForEmail(c.env, session.email)
    const returnUrl = `${getPublicOrigin(c.env, c.req.url)}/profile/plans?billing=success`

    try {
        const result = await restartBillingWithSeats(c.env, {
            customer,
            email: session.email,
            quantity,
            returnUrl,
            timing,
        })

        if (result.deferred && result.reminderAt) {
            return c.json({
                deferred: true,
                reminderAt: result.reminderAt,
                quantity,
                message: `Saved. Come back on ${new Date(result.reminderAt).toLocaleDateString()} (2 days before renewal) to cancel and checkout with ${quantity} seat${quantity === 1 ? "" : "s"}.`,
            })
        }

        return c.json({
            url: result.url,
            sessionId: result.sessionId ?? null,
            pendingCheckout: true,
            quantity,
            message:
                "Your current plan was cancelled. Complete checkout to activate your new seat count. Time left on your current plan is not refunded.",
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : "Plan restart failed"
        const status = billingErrorStatus(message)
        console.error("billing restart error", error)
        return c.json({ error: toUserFacingSeatChangeError(message) }, status)
    }
})

billingRoutes.post("/pending-checkout", async c => {
    const session = await readSession(c.env, c.req.header("Cookie"))
    if (!session) {
        return c.json({ error: "Unauthorized" }, 401)
    }

    let body: { quantity?: unknown }
    try {
        body = await c.req.json()
    } catch {
        return c.json({ error: "Invalid JSON body" }, 400)
    }

    const quantity = parseCheckoutQuantity(body.quantity)
    if (quantity === null) {
        return c.json({ error: "quantity must be an integer between 1 and 100" }, 400)
    }

    const customer = await ensureCustomerForEmail(c.env, session.email)
    const returnUrl = `${getPublicOrigin(c.env, c.req.url)}/profile/plans?billing=success`

    try {
        const result = await completePendingCheckout(c.env, {
            customer,
            email: session.email,
            quantity,
            returnUrl,
        })
        return c.json({
            url: result.url,
            sessionId: result.sessionId ?? null,
            message: "Continue checkout to activate your new plan.",
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : "Checkout failed"
        console.error("billing pending checkout error", error)
        return c.json({ error: toUserFacingSeatChangeError(message) }, 502)
    }
})
