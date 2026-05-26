import { buildSyncPayload } from "@notion-framer/shared"
import { getProject, getProjectMappings, getProjectSecrets } from "../db.js"
import type { Env } from "../env.js"

export async function buildProjectSyncPayload(env: Env, projectId: string) {
    const project = await getProject(env, projectId)
    if (!project) throw new Error("Project not found")
    if (project.license_status !== "active") throw new Error("License inactive")

    const secrets = await getProjectSecrets(env, projectId)
    if (!secrets) throw new Error("Project secrets not found")

    const mappings = await getProjectMappings(env, projectId)
    const payload = await buildSyncPayload(
        secrets.notionToken,
        project.notion_data_source_id,
        mappings,
        project.slug_notion_property_id
    )

    return { project, payload, mappings }
}
