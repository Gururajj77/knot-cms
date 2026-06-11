import { buildFramerSyncTarget, type FramerSyncTarget } from "@knotcms/shared"
import type { FramerCollectionSummary } from "../../../lib/api"

export function resolveEffectiveFramerSyncTarget(
    framerSyncTarget: FramerSyncTarget | null,
    resolvedFramerCollection: FramerCollectionSummary | null,
    notionSourceTitle?: string | null
): FramerSyncTarget | null {
    if (framerSyncTarget) return framerSyncTarget
    if (!resolvedFramerCollection) return null
    return buildFramerSyncTarget(resolvedFramerCollection, notionSourceTitle)
}
