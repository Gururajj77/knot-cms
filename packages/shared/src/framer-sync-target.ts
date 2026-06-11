import type { FramerCollectionManagedBy } from "./framer-collections.js"
import { KNOTCMS_COLLECTION_SUFFIX, managedCollectionSyncName } from "./framer-sync-name.js"
import { PENDING_FRAMER_COLLECTION_ID } from "./types.js"

export type FramerSyncMode = "managed" | "managed_in_place" | "user"

/** Where Notion rows are written when a Framer collection was selected in setup. */
export type FramerSyncDestination = "in_place" | "new_managed"

/** Resolved Framer sync destination for a setup path or stored project. */
export interface FramerSyncTarget {
    syncMode: FramerSyncMode
    templateCollectionId: string
    templateManagedBy: FramerCollectionManagedBy
    /** Collection KnotCMS writes to (`user` / `managed_in_place` = template id; `managed` = pending until first sync). */
    syncCollectionId: string
    syncCollectionName: string
}

/** Collections created or managed by any Framer plugin integration. */
export function isPluginOwnedFramerCollection(managedBy: FramerCollectionManagedBy): boolean {
    return managedBy === "thisPlugin" || managedBy === "anotherPlugin"
}

/** Sync writes into the user's selected collection (not a new · KnotCMS collection). */
export function isInPlaceFramerSyncMode(syncMode: FramerSyncMode): boolean {
    return syncMode === "user" || syncMode === "managed_in_place"
}

export function usesExplicitFramerCollectionId(syncMode: FramerSyncMode): boolean {
    return isInPlaceFramerSyncMode(syncMode)
}

export function resolveFramerSyncMode(managedBy: FramerCollectionManagedBy): FramerSyncMode {
    if (managedBy === "user") return "user"
    if (managedBy === "thisPlugin") return "managed_in_place"
    return "managed"
}

export function buildFramerSyncTarget(
    collection: { id: string; name: string; managedBy: FramerCollectionManagedBy },
    notionTitle?: string | null,
    options?: { destination?: FramerSyncDestination }
): FramerSyncTarget {
    const titleBase = notionTitle?.trim() || collection.name
    const destination =
        options?.destination ??
        (collection.managedBy === "anotherPlugin" ? "new_managed" : "in_place")

    if (destination === "new_managed" || collection.managedBy === "anotherPlugin") {
        return {
            syncMode: "managed",
            templateCollectionId: collection.id,
            templateManagedBy: collection.managedBy,
            syncCollectionId: PENDING_FRAMER_COLLECTION_ID,
            syncCollectionName: managedCollectionSyncName(titleBase),
        }
    }

    const syncMode = resolveFramerSyncMode(collection.managedBy)

    return {
        syncMode,
        templateCollectionId: collection.id,
        templateManagedBy: collection.managedBy,
        syncCollectionId: collection.id,
        syncCollectionName: collection.name,
    }
}

/** Read sync mode from D1, with fallback when migration or wizard state was incomplete. */
export function resolveProjectFramerSyncMode(project: {
    framer_sync_mode?: string | null
    framer_collection_id: string
    framer_collection_name?: string | null
}): FramerSyncMode {
    if (project.framer_sync_mode === "user") return "user"
    if (project.framer_sync_mode === "managed_in_place") return "managed_in_place"
    if (project.framer_sync_mode === "managed") return "managed"

    if (
        project.framer_collection_id &&
        project.framer_collection_id !== PENDING_FRAMER_COLLECTION_ID &&
        !project.framer_collection_name?.endsWith(KNOTCMS_COLLECTION_SUFFIX)
    ) {
        return "user"
    }

    return "managed"
}
