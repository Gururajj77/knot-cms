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

export function normalizeFramerItemSlug(slug: string): string {
    return slug.trim().toLowerCase()
}

export type UserCollectionSyncItem = Omit<FramerItemPayload, "id"> & { id?: string }

export type UserCollectionSyncPlan = {
    /** Items ready for Framer `addItems` (existing rows keep Framer ids; new rows omit id). */
    items: UserCollectionSyncItem[]
    idsToRemove: string[]
}

/**
 * User-owned Framer collections already have item ids. Notion page ids must not be sent
 * as Framer item ids — match existing rows by slug and only create new rows without an id.
 */
export function planUserCollectionSync(
    items: FramerItemPayload[],
    existingItems: Array<{ id: string; slug: string }>
): UserCollectionSyncPlan {
    const idBySlug = new Map(
        existingItems.map(item => [normalizeFramerItemSlug(item.slug), item.id])
    )
    const wantedSlugs = new Set<string>()
    const resolvedItems: UserCollectionSyncItem[] = []

    for (const item of items) {
        const slugKey = normalizeFramerItemSlug(item.slug)
        wantedSlugs.add(slugKey)
        const existingId = idBySlug.get(slugKey)
        if (existingId) {
            resolvedItems.push({ ...item, id: existingId })
            continue
        }

        const { id: _notionId, ...withoutId } = item
        resolvedItems.push(withoutId)
    }

    const idsToRemove = existingItems
        .filter(item => !wantedSlugs.has(normalizeFramerItemSlug(item.slug)))
        .map(item => item.id)

    return { items: resolvedItems, idsToRemove }
}
