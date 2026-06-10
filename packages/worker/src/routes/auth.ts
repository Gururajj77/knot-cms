import { Hono } from "hono"
import { isAuthDevAllowAny } from "../auth/google-config.js"
import { readSession } from "../auth/middleware.js"
import {
    ensureCustomerForEmail,
    getCustomerByEmail,
    getCustomerById,
    isCustomerEntitled,
} from "../db/customers.js"
import type { Env } from "../env.js"
import { getCustomerUsage, resolvePlanId } from "../lib/entitlements.js"

export const authRoutes = new Hono<{ Bindings: Env }>()

authRoutes.get("/me", async c => {
    const session = await readSession(c.env, c.req.header("Cookie"))
    if (!session) {
        return c.json({ authenticated: false }, 401)
    }

    const devBypass = isAuthDevAllowAny(c.env)
    let customer =
        session.sub.startsWith("dev:") || session.sub.startsWith("acct:")
            ? await getCustomerByEmail(c.env, session.email)
            : ((await getCustomerById(c.env, session.sub)) ??
              (await getCustomerByEmail(c.env, session.email)))

    if (!customer && !session.sub.startsWith("dev:")) {
        customer = await ensureCustomerForEmail(c.env, session.email)
    }

    const entitled = devBypass || isCustomerEntitled(customer)
    const usage = customer ? await getCustomerUsage(c.env, customer) : null

    return c.json({
        authenticated: true,
        email: session.email,
        customerId: customer?.id ?? (session.sub.startsWith("dev:") ? null : session.sub),
        entitled,
        planId: resolvePlanId(customer),
        subscriptionStatus: customer?.subscription_status ?? "inactive",
        checkoutUrl: c.env.BILLING_CHECKOUT_URL?.trim() ?? null,
        usage: usage
            ? {
                  planId: usage.planId,
                  planName: usage.plan.name,
                  projectCount: usage.projectCount,
                  projectLimit: usage.plan.projectLimit,
                  syncCount: usage.syncCount,
                  syncRemaining: usage.syncRemaining,
                  features: usage.plan.features,
              }
            : null,
    })
})
