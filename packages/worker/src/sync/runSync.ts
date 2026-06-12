import {
    alignItemsToFramerFields,
    SyncBoundaryError,
    classifySyncError,
    managedCollectionSyncName,
    prepareSyncItems,
    resolveProjectFramerSyncMode,
    type SyncResult,
} from "@knotcms/shared"
import { connect, type ManagedCollectionItemInput } from "framer-api"
import {
    getProject,
    getProjectSecrets,
    releaseSyncLock,
    tryAcquireSyncLock,
    updateProjectCollection,
    updateSyncState,
} from "../db.js"
import type { Env } from "../env.js"
import { assertSyncAllowed, recordSyncUsage } from "../lib/entitlements.js"
import { buildProjectSyncPayload } from "./buildPayload.js"
import {
    collectionDisplayName,
    fieldMappingsToManagedInputs,
    findOrCreateManagedCollection,
    refreshManagedCollection,
    syncToExistingManagedCollection,
    syncToUserCollection,
    withFramerRetry,
} from "./framerCollection.js"
import { publishAfterSync } from "./publishAfterSync.js"

/**
 * Headless sync via Framer Server API (see framer/server-api-examples notion-automations-sync).
 * User CMS collections sync in place; plugin-owned templates use a separate managed collection.
 */
export async function runSync(env: Env, projectId: string): Promise<SyncResult> {
    const locked = await tryAcquireSyncLock(env, projectId)
    if (!locked) {
        throw new SyncBoundaryError("SYNC_IN_PROGRESS", "Sync already in progress for this connection.")
    }

    try {
        const projectForQuota = await getProject(env, projectId)
        await assertSyncAllowed(env, projectForQuota?.customer_id ?? null)

        const { project, payload, mappings, rowCapWarning } = await buildProjectSyncPayload(
            env,
            projectId
        )
        const secrets = await getProjectSecrets(env, projectId)
        if (!secrets) {
            throw new SyncBoundaryError("SECRETS_MISSING", "Project secrets not found")
        }

        const { items: syncItems, warnings } = prepareSyncItems(payload.items)
        if (rowCapWarning) warnings.unshift(rowCapWarning)
        for (const w of warnings) {
            console.warn(`[sync ${projectId}] ${w}`)
        }

        const projectUrl = project.framer_project_url.replace(/\/$/, "")
        using framer = await connect(projectUrl, secrets.framerApiKey)

        const syncMode = resolveProjectFramerSyncMode(project)
        const preserveUnlinkedFramerRows = project.preserve_unlinked_framer_rows === 1
        const inPlaceSyncOptions = { preserveUnlinkedFramerRows }
        let itemsSynced = 0
        let itemsRemoved = 0

        if (syncMode === "user") {
            const userResult = await syncToUserCollection(
                framer,
                project.framer_collection_id,
                mappings,
                syncItems,
                inPlaceSyncOptions
            )
            itemsSynced = userResult.itemsSynced
            itemsRemoved = userResult.itemsRemoved

            if (
                userResult.collection.id !== project.framer_collection_id ||
                userResult.collection.name !== project.framer_collection_name
            ) {
                await updateProjectCollection(
                    env,
                    projectId,
                    userResult.collection.id,
                    userResult.collection.name
                )
            }
        } else if (syncMode === "managed_in_place") {
            const managedResult = await syncToExistingManagedCollection(
                framer,
                project.framer_collection_id,
                mappings,
                syncItems,
                inPlaceSyncOptions
            )
            itemsSynced = managedResult.itemsSynced
            itemsRemoved = managedResult.itemsRemoved

            if (
                managedResult.collection.id !== project.framer_collection_id ||
                managedResult.collection.name !== project.framer_collection_name
            ) {
                await updateProjectCollection(
                    env,
                    projectId,
                    managedResult.collection.id,
                    managedResult.collection.name
                )
            }
        } else {
            const collectionName = managedCollectionSyncName(
                project.framer_collection_name ?? collectionDisplayName(project.source_title)
            )

            let collection = await findOrCreateManagedCollection(framer, collectionName)
            const fieldInputs = fieldMappingsToManagedInputs(mappings)

            await withFramerRetry("setFields", () => collection.setFields(fieldInputs))

            collection = await refreshManagedCollection(framer, collectionName)

            const framerFields = await withFramerRetry("getFields", () => collection.getFields())
            const alignedItems = alignItemsToFramerFields(syncItems, mappings, framerFields)

            if (
                collection.id !== project.framer_collection_id ||
                collection.name !== project.framer_collection_name
            ) {
                await updateProjectCollection(env, projectId, collection.id, collection.name)
            }

            const existingIds = new Set(
                await withFramerRetry("getItemIds", () => collection.getItemIds())
            )
            const notionIds = new Set(alignedItems.map(i => i.id))
            const toRemove = [...existingIds].filter(id => !notionIds.has(id))

            if (toRemove.length > 0) {
                await withFramerRetry("removeItems", () => collection.removeItems(toRemove))
            }

            if (alignedItems.length > 0) {
                await withFramerRetry("addItems", () =>
                    collection.addItems(alignedItems as unknown as ManagedCollectionItemInput[])
                )
            }

            itemsSynced = alignedItems.length
            itemsRemoved = toRemove.length
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
            itemsSyncedCount: itemsSynced,
        })

        if (project.customer_id) {
            await recordSyncUsage(env, project.customer_id)
        }

        return {
            itemsSynced,
            itemsRemoved,
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
