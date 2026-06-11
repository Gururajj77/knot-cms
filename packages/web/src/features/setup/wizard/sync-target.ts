import {
    buildFramerSyncTarget,
    type FramerSyncDestination,
    type FramerSyncTarget,
} from "@knotcms/shared"
import type { FramerCollectionSummary } from "../../../lib/api"

export function resolveEffectiveFramerSyncTarget(
    framerSyncTarget: FramerSyncTarget | null,
    resolvedFramerCollection: FramerCollectionSummary | null,
    notionSourceTitle?: string | null,
    syncDestination: FramerSyncDestination = "in_place"
): FramerSyncTarget | null {
    if (syncDestination === "new_managed" && resolvedFramerCollection) {
        return buildFramerSyncTarget(resolvedFramerCollection, notionSourceTitle, {
            destination: "new_managed",
        })
    }

    if (framerSyncTarget) return framerSyncTarget
    if (!resolvedFramerCollection) return null

    return buildFramerSyncTarget(resolvedFramerCollection, notionSourceTitle, {
        destination: syncDestination,
    })
}
