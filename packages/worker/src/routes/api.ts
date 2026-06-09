import { Hono } from "hono"
import type { Env } from "../env.js"

/**
 * Legacy plugin API — disabled for security.
 * The web dashboard uses /api/dashboard/* with session auth.
 */
export const api = new Hono<{ Bindings: Env }>()

api.all("*", c =>
    c.json(
        {
            error: "Legacy plugin API is disabled. Use the PublishFlow web dashboard.",
            code: "API_DEPRECATED",
        },
        410
    )
)
