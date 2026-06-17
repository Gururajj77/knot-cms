import type { DeleteProjectResponse } from "@knotcms/shared"
import { getProject } from "../db.js"
import type { Env } from "../env.js"

async function deleteProjectRecord(env: Env, projectId: string): Promise<boolean> {
    const project = await getProject(env, projectId)
    if (!project) return false

    await env.DB.batch([
        env.DB.prepare(`DELETE FROM debounce_sync WHERE project_id = ?`).bind(projectId),
        env.DB.prepare(`DELETE FROM projects WHERE id = ?`).bind(projectId),
    ])

    return true
}

export async function deleteProject(env: Env, projectId: string): Promise<DeleteProjectResponse | null> {
    const deleted = await deleteProjectRecord(env, projectId)
    if (!deleted) return null

    return { deleted: true }
}
