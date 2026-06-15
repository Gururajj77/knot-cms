import { cors } from "hono/cors"
import { Hono } from "hono"
import type { Env } from "../env.js"

export const pluginRoutes = new Hono<{ Bindings: Env }>()

pluginRoutes.use(
    "*",
    cors({
        origin: "*",
        allowMethods: ["GET", "OPTIONS"],
    })
)

pluginRoutes.get("/config", c => {
    const webAppUrl = c.env.WEB_APP_URL.replace(/\/$/, "")
    return c.json({ webAppUrl })
})
