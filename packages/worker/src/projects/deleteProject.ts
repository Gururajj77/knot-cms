import type { DeleteProjectResponse } from "@nocms/shared"
import { connect } from "framer-api"
import { getProject, getProjectSecrets } from "../db.js"
import type { Env } from "../env.js"
import { clearManagedCollection } from "../sync/framerCollection.js"

export async function deleteProjectRecord(env: Env, projectId: string): Promise<boolean> {
    const project = await getProject(env, projectId)
    if (!project) return false

    await env.DB.batch([
        env.DB.prepare(`DELETE FROM debounce_sync WHERE project_id = ?`).bind(projectId),
        env.DB.prepare(`DELETE FROM projects WHERE id = ?`).bind(projectId),
    ])

    return true
}

export async function deleteProject(
    env: Env,
    projectId: string,
    options: { deleteFramerCollection: boolean }
): Promise<DeleteProjectResponse | null> {
    const project = await getProject(env, projectId)
    if (!project) return null

    let framerCollectionCleared: DeleteProjectResponse["framerCollectionCleared"]
    let framerWarning: string | undefined

    if (options.deleteFramerCollection && project.framer_collection_id !== "pending") {
        const secrets = await getProjectSecrets(env, projectId)
        if (secrets?.framerApiKey) {
            try {
                const projectUrl = project.framer_project_url.replace(/\/$/, "")
                using framer = await connect(projectUrl, secrets.framerApiKey)
                framerCollectionCleared = await clearManagedCollection(framer, {
                    collectionId: project.framer_collection_id,
                    collectionName: project.framer_collection_name,
                })
            } catch (error) {
                framerWarning =
                    error instanceof Error
                        ? error.message
                        : "Could not clear the Framer CMS collection."
            }
        }
    }

    const deleted = await deleteProjectRecord(env, projectId)
    if (!deleted) return null

    return {
        deleted: true,
        framerCollectionCleared,
        framerWarning,
    }
}
