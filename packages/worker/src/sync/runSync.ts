import {
    SyncBoundaryError,
    classifySyncError,
    prepareSyncItems,
    type SyncResult,
} from "@notion-framer/shared"
import { connect, type ManagedCollectionItemInput } from "framer-api"
import {
    getProjectSecrets,
    releaseSyncLock,
    tryAcquireSyncLock,
    updateProjectCollection,
    updateSyncState,
} from "../db.js"
import type { Env } from "../env.js"
import { buildProjectSyncPayload } from "./buildPayload.js"
import {
    collectionDisplayName,
    fieldMappingsToManagedInputs,
    findOrCreateManagedCollection,
    refreshManagedCollection,
    withFramerRetry,
} from "./framerCollection.js"
import { publishAfterSync } from "./publishAfterSync.js"

/**
 * Headless sync via Framer Server API (see framer/server-api-examples notion-automations-sync).
 * Collections must be created/found via API — use createManagedCollection, resolve by name.
 */
export async function runSync(env: Env, projectId: string): Promise<SyncResult> {
    const locked = await tryAcquireSyncLock(env, projectId)
    if (!locked) {
        throw new SyncBoundaryError("SYNC_IN_PROGRESS", "Sync already in progress for this connection.")
    }

    try {
        const { project, payload, mappings } = await buildProjectSyncPayload(env, projectId)
        const secrets = await getProjectSecrets(env, projectId)
        if (!secrets) {
            throw new SyncBoundaryError("SECRETS_MISSING", "Project secrets not found")
        }

        const { items: syncItems, warnings } = prepareSyncItems(payload.items)
        for (const w of warnings) {
            console.warn(`[sync ${projectId}] ${w}`)
        }

        const collectionName =
            project.framer_collection_name ?? collectionDisplayName(project.notion_data_source_title)
        const projectUrl = project.framer_project_url.replace(/\/$/, "")

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
        const notionIds = new Set(syncItems.map(i => i.id))
        const toRemove = [...existingIds].filter(id => !notionIds.has(id))

        if (toRemove.length > 0) {
            await withFramerRetry("removeItems", () => collection.removeItems(toRemove))
        }

        if (syncItems.length > 0) {
            await withFramerRetry("addItems", () =>
                collection.addItems(syncItems as unknown as ManagedCollectionItemInput[])
            )
        }

        const publishResult = await publishAfterSync(
            env,
            projectId,
            framer,
            project.auto_publish === 1,
            project.publish_mode
        )

        await updateSyncState(env, projectId, {
            lastSyncAt: new Date().toISOString(),
            lastError: null,
            lastErrorCode: null,
            itemsSyncedCount: syncItems.length,
        })

        return {
            itemsSynced: syncItems.length,
            itemsRemoved: toRemove.length,
            published: publishResult.published,
            deployed: publishResult.deployed,
            publishSkipped: publishResult.publishSkipped,
            publishSkipReason: publishResult.publishSkipReason,
        }
    } catch (error) {
        const { code, error: message } = classifySyncError(error)
        await updateSyncState(env, projectId, {
            lastError: message,
            lastErrorCode: code,
        })
        throw error
    } finally {
        await releaseSyncLock(env, projectId)
    }
}
