import { Hono } from "hono"
import { readSession } from "../auth/middleware.js"
import type { Env } from "../env.js"

export const authRoutes = new Hono<{ Bindings: Env }>()

authRoutes.get("/me", async c => {
    const session = await readSession(c.env, c.req.header("Cookie"))
    if (!session) {
        return c.json({ authenticated: false }, 401)
    }

    return c.json({
        authenticated: true,
        email: session.email,
        customerId: session.sub.startsWith("dev:") ? null : session.sub,
    })
})
