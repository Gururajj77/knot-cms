import { framer, type ProtectedMethod } from "framer-plugin"
import type { SyncResult } from "@notion-framer/shared"
import {
    buildFramerFields,
    defaultFramerTypeForNotion,
    PLUGIN_KEYS,
    type FieldMapping,
    type FramerFieldDefinition,
} from "@notion-framer/shared"
import { getProjectStatus, triggerSync } from "./api"

export { PLUGIN_KEYS }

export interface NotionDataSourceConfig {
    id: string
    title: string
    databaseId?: string
    properties: Array<{ id: string; name: string; type: string }>
}

export function propertiesToFieldMappings(
    properties: Array<{ id: string; name: string; type: string }>
): FieldMapping[] {
    const mappings: FieldMapping[] = []
    for (const prop of properties) {
        const framerType = defaultFramerTypeForNotion(prop.type)
        if (!framerType) continue
        mappings.push({
            notionPropertyId: prop.id,
            notionPropertyName: prop.name,
            notionPropertyType: prop.type,
            framerFieldId: prop.id.replace(/-/g, "").slice(0, 64),
            framerFieldName: prop.name,
            framerFieldType: framerType,
            ignored: false,
            contentType: framerType === "formattedText" ? "markdown" : undefined,
        })
    }
    return mappings
}

export function framerFieldsToManagedInput(
    fields: FramerFieldDefinition[]
): import("framer-plugin").ManagedCollectionFieldInput[] {
    const result: import("framer-plugin").ManagedCollectionFieldInput[] = []
    for (const f of fields) {
        if (f.type === "enum" && f.cases) {
            result.push({ id: f.id, name: f.name, type: "enum", cases: f.cases })
            continue
        }
        if (
            f.type === "string" ||
            f.type === "number" ||
            f.type === "boolean" ||
            f.type === "formattedText" ||
            f.type === "date" ||
            f.type === "link" ||
            f.type === "image"
        ) {
            result.push({ id: f.id, name: f.name, type: f.type })
        }
    }
    return result
}

export function mappingsToManagedFields(
    mappings: FieldMapping[]
): import("framer-plugin").ManagedCollectionFieldInput[] {
    return framerFieldsToManagedInput(buildFramerFields(mappings))
}

export const syncMethods = [
    "ManagedCollection.setPluginData",
] as const satisfies ProtectedMethod[]

/** Server API sync — creates/updates the CMS collection named after the Notion database. */
export async function syncCollectionFromWorker(projectId: string): Promise<SyncResult> {
    return triggerSync(projectId)
}

export function formatSyncResult(result: SyncResult, collectionName: string): string {
    const parts = [`Synced ${result.itemsSynced} items to “${collectionName}”`]
    if (result.itemsRemoved > 0) parts.push(`removed ${result.itemsRemoved}`)
    if (result.published) parts.push(result.deployed ? "published live" : "preview published")
    return parts.join(", ") + "."
}

export async function syncExistingCollection(
    projectId: string | null,
    collectionName: string | null
): Promise<{ didSync: boolean }> {
    if (!projectId) {
        return { didSync: false }
    }

    if (framer.mode !== "syncManagedCollection") {
        return { didSync: false }
    }

    try {
        const status = await getProjectStatus(projectId)
        if (status.licenseStatus !== "active") {
            framer.notify("License inactive. Open plugin settings to renew.", { variant: "error" })
            return { didSync: false }
        }

        const result = await syncCollectionFromWorker(projectId)
        const name = collectionName ?? status.framerCollectionName ?? "Notion Sync"
        framer.closePlugin(formatSyncResult(result, name), { variant: "success" })
        return { didSync: true }
    } catch (error) {
        console.error(error)
        const msg = error instanceof Error ? error.message : "Sync failed"
        framer.notify(msg, { variant: "error", durationMs: 10000 })
        return { didSync: false }
    }
}
