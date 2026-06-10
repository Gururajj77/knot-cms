import { isAllowedFramerProjectUrl, normalizeFramerProjectUrl } from "@notion-framer/shared"
import { cors } from "hono/cors"
import { Hono } from "hono"
import { findProjectPublicByFramerUrl } from "../db.js"
import type { Env } from "../env.js"

export const pluginRoutes = new Hono<{ Bindings: Env }>()

pluginRoutes.use(
    "*",
    cors({
        origin: "*",
        allowMethods: ["GET", "OPTIONS"],
    })
)

pluginRoutes.get("/config", c => c.json({ webAppUrl: c.env.WEB_APP_URL }))

/** Public lookup so the Framer plugin can link this project after dashboard setup. */
pluginRoutes.get("/link", async c => {
    const raw = c.req.query("framerProjectUrl")
    if (!raw?.trim() || !isAllowedFramerProjectUrl(raw)) {
        return c.json({ linked: false as const })
    }

    const project = await findProjectPublicByFramerUrl(c.env, normalizeFramerProjectUrl(raw))
    if (!project) {
        return c.json({ linked: false as const })
    }

    return c.json({
        linked: true as const,
        projectId: project.id,
        notionDataSourceTitle: project.notionDataSourceTitle,
        framerCollectionName: project.framerCollectionName,
        lastSyncAt: project.lastSyncAt,
    })
})
