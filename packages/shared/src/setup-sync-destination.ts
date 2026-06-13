import type { FramerCollectionManagedBy } from "./framer-collections.js"
import type { FramerSyncDestination } from "./framer-sync-target.js"
import type { SetupPathId } from "./setup-paths.js"

export interface SetupSyncCollectionContext {
    managedBy: FramerCollectionManagedBy
}

/** Whether the mapping step should show the in-place vs new-managed chooser. */
export function canChooseFramerSyncDestination(
    path: SetupPathId | null,
    collection: SetupSyncCollectionContext | null | undefined
): boolean {
    if (path === "notion_to_framer") return false
    if (!collection) return false
    if (collection.managedBy === "anotherPlugin") return false
    return true
}

/** Sync destination written to Framer after applying setup path and collection rules. */
export function resolveEffectiveSyncDestination(
    path: SetupPathId | null,
    syncDestination: FramerSyncDestination,
    collection: SetupSyncCollectionContext | null | undefined
): FramerSyncDestination {
    if (path === "notion_to_framer") return "new_managed"
    if (!canChooseFramerSyncDestination(path, collection)) return "new_managed"
    return syncDestination
}

/** Default sync destination when the user picks a setup path on step 2. */
export function syncDestinationForSetupPath(path: SetupPathId): FramerSyncDestination {
    return path === "notion_to_framer" ? "new_managed" : "in_place"
}
