import type { FramerSyncTarget } from "@knotcms/shared"
import type { FramerCollectionSummary } from "../../../lib/api"

export interface UseSetupWizardOptions {
    onProjectCreated?: () => void | Promise<void>
    hasAutoSync?: boolean
    hasAutoPublish?: boolean
}

/** Fallback setup path when the user continues without selecting a Framer collection. */
export const DEFAULT_SETUP_PATH = "notion_to_framer" as const

/** Build a collection summary from persisted sync target when the list has not reloaded yet. */
export function framerCollectionFromSyncTarget(
    framerSyncTarget: FramerSyncTarget
): FramerCollectionSummary {
    const templateName =
        framerSyncTarget.syncMode === "user"
            ? framerSyncTarget.syncCollectionName
            : framerSyncTarget.syncCollectionName.replace(/ · KnotCMS$/, "")

    return {
        id: framerSyncTarget.templateCollectionId,
        name: templateName,
        managedBy: framerSyncTarget.templateManagedBy,
        canUseAsTemplate: framerSyncTarget.templateManagedBy !== "anotherPlugin",
        itemCount: 0,
        fields: [],
        bootstrapPreview: {
            eligible: framerSyncTarget.templateManagedBy !== "anotherPlugin",
            mappedFieldCount: 0,
            skippedFieldCount: 0,
            titleFieldId: null,
            warnings: [],
            ineligibleReason:
                framerSyncTarget.templateManagedBy === "anotherPlugin"
                    ? "Collections managed by another plugin cannot be used as a template"
                    : undefined,
        },
    }
}
