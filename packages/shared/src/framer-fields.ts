import type { FieldMapping } from "./types.js"
import type { FramerItemPayload } from "./transforms.js"

export interface FramerFieldRef {
    id: string
    name: string
}

/**
 * Map item fieldData keys to the field ids Framer actually has on the collection.
 * Framer may assign different ids than we stored when the collection already existed.
 */
export function alignItemsToFramerFields(
    items: FramerItemPayload[],
    mappings: FieldMapping[],
    framerFields: FramerFieldRef[]
): FramerItemPayload[] {
    const allowedIds = new Set(framerFields.map(f => f.id))
    const idByName = new Map(framerFields.map(f => [normalizeFieldName(f.name), f.id]))
    const mappingBySourceKey = new Map(
        mappings.filter(m => !m.ignored).map(m => [m.framerFieldId, m])
    )

    return items.map(item => {
        const fieldData: FramerItemPayload["fieldData"] = {}

        for (const [sourceKey, value] of Object.entries(item.fieldData)) {
            const mapping = mappingBySourceKey.get(sourceKey)
            const targetId = mapping
                ? (idByName.get(normalizeFieldName(mapping.framerFieldName)) ?? sourceKey)
                : sourceKey

            if (allowedIds.has(targetId)) {
                fieldData[targetId] = value
            }
        }

        return { ...item, fieldData }
    })
}

function normalizeFieldName(name: string): string {
    return name.trim().toLowerCase()
}
