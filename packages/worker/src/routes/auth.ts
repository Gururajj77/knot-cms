import { Hono } from "hono"
import { isAuthDevAllowAny } from "../auth/google-config.js"
import { readSession } from "../auth/middleware.js"
import { getCustomerByEmail, getCustomerById, isCustomerEntitled } from "../db/customers.js"
import type { Env } from "../env.js"

export const authRoutes = new Hono<{ Bindings: Env }>()

authRoutes.get("/me", async c => {
    const session = await readSession(c.env, c.req.header("Cookie"))
    if (!session) {
        return c.json({ authenticated: false }, 401)
    }

    const devBypass = isAuthDevAllowAny(c.env)
    const customer = session.sub.startsWith("dev:")
        ? await getCustomerByEmail(c.env, session.email)
        : await getCustomerById(c.env, session.sub)

    const entitled = devBypass || isCustomerEntitled(customer)

    return c.json({
        authenticated: true,
        email: session.email,
        customerId: customer?.id ?? (session.sub.startsWith("dev:") ? null : session.sub),
        entitled,
        subscriptionStatus: customer?.subscription_status ?? "inactive",
        checkoutUrl: c.env.BILLING_CHECKOUT_URL?.trim() ?? null,
    })
})
