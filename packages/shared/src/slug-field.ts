import type { FieldMapping } from "./types.js"
import type { SetupSourceProvider } from "./setup-paths.js"

const NOTION_STRING_SOURCE_TYPES = new Set(["title", "email", "phone_number", "unique_id"])

export function isSlugEligibleFieldMapping(
    mapping: FieldMapping,
    source: SetupSourceProvider
): boolean {
    if (mapping.framerFieldType === "string") return true
    if (source === "google_sheets") {
        return mapping.notionPropertyType === "string" || mapping.notionPropertyType === "url"
    }
    return NOTION_STRING_SOURCE_TYPES.has(mapping.notionPropertyType)
}

/** All active mapped fields the user can pick as the slug source. */
export function slugFieldOptions(
    mappings: FieldMapping[],
    _source: SetupSourceProvider,
    ignored: ReadonlySet<string> = new Set()
): FieldMapping[] {
    return mappings.filter(mapping => !ignored.has(mapping.notionPropertyId))
}

export function slugTextFromTransformedValue(
    transformed: { value: unknown } | null | undefined
): string | null {
    if (!transformed) return null

    const { value } = transformed
    if (typeof value === "string") {
        const trimmed = value.trim()
        return trimmed || null
    }
    if (typeof value === "number" && Number.isFinite(value)) {
        return String(value)
    }
    if (typeof value === "boolean") {
        return value ? "true" : "false"
    }
    return null
}

/** Preferred default slug field when the user has not chosen one yet. */
export function defaultSlugPropertyId(
    mappings: FieldMapping[],
    source: SetupSourceProvider,
    ignored: ReadonlySet<string> = new Set()
): string {
    const options = slugFieldOptions(mappings, source, ignored)
    const title = options.find(mapping => mapping.notionPropertyType === "title")
    if (title) return title.notionPropertyId

    const strict = options.find(mapping => isSlugEligibleFieldMapping(mapping, source))
    if (strict) return strict.notionPropertyId

    return options[0]?.notionPropertyId ?? ""
}
