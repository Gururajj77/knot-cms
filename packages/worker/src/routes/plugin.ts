import {
    FramerProjectIdSchema,
    FramerProjectUrlSchema,
    isAllowedFramerProjectUrl,
    normalizeFramerProjectUrl,
} from "@knotcms/shared"
import { cors } from "hono/cors"
import { Hono } from "hono"
import { listProjectsByFramerEditorId, listProjectsByFramerSite } from "../db.js"
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
    return c.json({
        webAppUrl,
        setupUrl: `${webAppUrl}/setup`,
        homeUrl: `${webAppUrl}/`,
    })
})

pluginRoutes.get("/projects", async c => {
    const rawId = c.req.query("framerProjectId")?.trim() ?? ""
    if (rawId) {
        const parsedId = FramerProjectIdSchema.safeParse(rawId)
        if (!parsedId.success) {
            return c.json({ error: "Invalid Framer project id" }, 400)
        }

        const projects = await listProjectsByFramerEditorId(c.env, parsedId.data)
        return c.json({
            framerProjectId: parsedId.data,
            connected: projects.length > 0,
            projects,
        })
    }

    const rawUrl = c.req.query("framerProjectUrl")?.trim() ?? ""
    if (!rawUrl) {
        return c.json({ error: "framerProjectId or framerProjectUrl is required" }, 400)
    }

    const parsed = FramerProjectUrlSchema.safeParse(rawUrl)
    if (!parsed.success || !isAllowedFramerProjectUrl(rawUrl)) {
        return c.json({ error: "Invalid Framer project URL" }, 400)
    }

    const framerProjectUrl = normalizeFramerProjectUrl(parsed.data)
    const projects = await listProjectsByFramerSite(c.env, framerProjectUrl)

    return c.json({
        framerProjectUrl,
        connected: projects.length > 0,
        projects,
    })
})
