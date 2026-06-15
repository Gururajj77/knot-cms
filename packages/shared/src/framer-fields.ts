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

export interface InPlaceSchemaCompatibility {
    matchedFieldCount: number
    unmappedNotionFields: string[]
    untouchedFramerFields: string[]
    warnings: string[]
}

/**
 * Compare active Notion mappings to an existing Framer collection schema.
 * In-place sync only writes values for matching column names — it never adds Framer fields.
 */
export type InPlaceSchemaCompatibilityOptions = {
    preserveUnlinkedFramerRows?: boolean
}

export function analyzeInPlaceSchemaCompatibility(
    mappings: FieldMapping[],
    framerFields: FramerFieldRef[],
    ignoredPropertyIds: ReadonlySet<string> = new Set(),
    options: InPlaceSchemaCompatibilityOptions = {}
): InPlaceSchemaCompatibility {
    const activeMappings = mappings.filter(
        m => !m.ignored && !ignoredPropertyIds.has(m.notionPropertyId)
    )
    const framerByName = new Map(framerFields.map(field => [normalizeFieldName(field.name), field]))
    const matchedFramerNames = new Set<string>()
    const unmappedNotionFields: string[] = []
    let matchedFieldCount = 0

    for (const mapping of activeMappings) {
        const framerField = framerByName.get(normalizeFieldName(mapping.framerFieldName))
        if (framerField) {
            matchedFieldCount++
            matchedFramerNames.add(normalizeFieldName(framerField.name))
            continue
        }
        unmappedNotionFields.push(mapping.notionPropertyName)
    }

    const untouchedFramerFields = framerFields
        .filter(field => !matchedFramerNames.has(normalizeFieldName(field.name)))
        .map(field => field.name)

    const warnings: string[] = []
    if (unmappedNotionFields.length > 0) {
        warnings.push(
            `Notion fields without a matching Framer column won't sync: ${unmappedNotionFields.join(", ")}.`
        )
    }
    if (untouchedFramerFields.length > 0) {
        warnings.push(
            `Existing Framer columns won't be updated from Notion: ${untouchedFramerFields.join(", ")}.`
        )
    }
    if (matchedFieldCount === 0 && activeMappings.length > 0) {
        warnings.push("No mapped fields match the selected Framer collection — sync will update slugs only.")
    }
    warnings.push(
        "KnotCMS won't add or rename columns on the selected collection — only values on matching fields."
    )
    if (options.preserveUnlinkedFramerRows) {
        warnings.push(
            "Framer rows not linked to a Notion page are left unchanged until you import or add matching rows in Notion."
        )
    } else {
        warnings.push("Framer rows whose slug isn't in Notion will be removed on each full sync.")
    }

    return {
        matchedFieldCount,
        unmappedNotionFields,
        untouchedFramerFields,
        warnings,
    }
}

export function normalizeFramerItemSlug(slug: string): string {
    return slug.trim().toLowerCase()
}

export function isFramerAssetUploadError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error)
    const lower = message.toLowerCase()
    return lower.includes("could not get asset") || lower.includes("assets upload")
}

/** Drop image field values so Framer sync can continue when remote asset fetch fails (429, hotlink blocks). */
export function stripImageFieldDataFromItems(items: FramerItemPayload[]): {
    items: FramerItemPayload[]
    strippedCount: number
} {
    let strippedCount = 0
    const next = items.map(item => {
        let changed = false
        const fieldData: FramerItemPayload["fieldData"] = {}
        for (const [key, entry] of Object.entries(item.fieldData)) {
            if (entry.type === "image") {
                strippedCount++
                changed = true
                continue
            }
            fieldData[key] = entry
        }
        return changed ? { ...item, fieldData } : item
    })
    return { items: next, strippedCount }
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
export type UserCollectionSyncOptions = {
    /** When false, Framer rows whose slug is not in Notion are left untouched. */
    removeUnmatched?: boolean
}

export function planUserCollectionSync(
    items: FramerItemPayload[],
    existingItems: Array<{ id: string; slug: string }>,
    options: UserCollectionSyncOptions = {}
): UserCollectionSyncPlan {
    const removeUnmatched = options.removeUnmatched !== false
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

    const idsToRemove = removeUnmatched
        ? existingItems
              .filter(item => !wantedSlugs.has(normalizeFramerItemSlug(item.slug)))
              .map(item => item.id)
        : []

    return { items: resolvedItems, idsToRemove }
}
