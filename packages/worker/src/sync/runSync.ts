import type { SyncResult } from "@notion-framer/shared"
import { connect, type ManagedCollectionItemInput } from "framer-api"
import { getProjectSecrets, updateProjectCollection, updateSyncState } from "../db.js"
import type { Env } from "../env.js"
import { buildProjectSyncPayload } from "./buildPayload.js"
import {
    collectionDisplayName,
    fieldMappingsToManagedInputs,
    findOrCreateManagedCollection,
    publishIfEnabled,
    refreshManagedCollection,
    withFramerRetry,
} from "./framerCollection.js"

/**
 * Headless sync via Framer Server API (see framer/server-api-examples notion-automations-sync).
 * Collections must be created/found via API — use createManagedCollection, resolve by name.
 */
export async function runSync(env: Env, projectId: string): Promise<SyncResult> {
    const { project, payload, mappings } = await buildProjectSyncPayload(env, projectId)
    const secrets = await getProjectSecrets(env, projectId)
    if (!secrets) {
        throw new Error("Project secrets not found")
    }

    const collectionName =
        project.framer_collection_name ?? collectionDisplayName(project.notion_data_source_title)
    const projectUrl = project.framer_project_url.replace(/\/$/, "")

    try {
        using framer = await connect(projectUrl, secrets.framerApiKey)

        let collection = await findOrCreateManagedCollection(framer, collectionName)

        const fieldInputs = fieldMappingsToManagedInputs(mappings)

        await withFramerRetry("setFields", () => collection.setFields(fieldInputs))

        collection = await refreshManagedCollection(framer, collectionName)

        if (
            collection.id !== project.framer_collection_id ||
            collection.name !== project.framer_collection_name
        ) {
            await updateProjectCollection(env, projectId, collection.id, collection.name)
        }

        const existingIds = new Set(
            await withFramerRetry("getItemIds", () => collection.getItemIds())
        )
        const notionIds = new Set(payload.items.map(i => i.id))
        const toRemove = [...existingIds].filter(id => !notionIds.has(id))

        if (toRemove.length > 0) {
            await withFramerRetry("removeItems", () => collection.removeItems(toRemove))
        }

        if (payload.items.length > 0) {
            await withFramerRetry("addItems", () =>
                collection.addItems(payload.items as unknown as ManagedCollectionItemInput[])
            )
        }

        const { published, deployed } = await publishIfEnabled(
            framer,
            project.auto_publish === 1,
            project.publish_mode
        )

        await updateSyncState(env, projectId, {
            lastSyncAt: new Date().toISOString(),
            lastError: null,
            itemsSyncedCount: payload.items.length,
        })

        return {
            itemsSynced: payload.items.length,
            itemsRemoved: toRemove.length,
            published,
            deployed,
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        await updateSyncState(env, projectId, { lastError: message })
        throw error
    }
}
