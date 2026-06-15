import type { Env } from "../env.js"
import { getProject } from "../db/projects.js"
import { ensureDriveWatchForProject } from "../webhooks/google-drive.js"
import { registerNotionWebhook } from "../webhooks/notion.js"

export async function registerProjectWatch(env: Env, projectId: string): Promise<void> {
    const project = await getProject(env, projectId)
    if (!project) return

    if (project.source_provider === "google_sheets") {
        await ensureDriveWatchForProject(env, projectId)
        return
    }

    await registerNotionWebhook(env, projectId)
}
