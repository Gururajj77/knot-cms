import type { FramerFieldType } from "./types.js"

/** Field shape from Framer Server API `getFields()` when listing a CMS collection. */
export type FramerTemplateFieldType =
    | FramerFieldType
    | "file"
    | "collectionReference"
    | "multiCollectionReference"
    | "array"
    | "divider"
    | "unsupported"

export interface FramerTemplateField {
    id: string
    name: string
    type: FramerTemplateFieldType
    cases?: Array<{ id: string; name: string }>
}

/** Subset of Notion `propertyConfigurationRequest` for `POST /v1/databases`. */
export type NotionPropertyConfiguration =
    | { title: Record<string, never> }
    | { rich_text: Record<string, never> }
    | { number: { format: "number" } }
    | { checkbox: Record<string, never> }
    | { select: { options: Array<{ name: string; color?: string }> } }
    | { date: Record<string, never> }
    | { url: Record<string, never> }

export type NotionPropertyType =
    | "title"
    | "rich_text"
    | "number"
    | "checkbox"
    | "select"
    | "date"
    | "url"

export type FramerToNotionMapResult =
    | { status: "mapped"; notionType: NotionPropertyType; configuration: NotionPropertyConfiguration }
    | { status: "skipped"; reason: string }

export interface NotionBootstrapSchema {
    /** Notion `initial_data_source.properties` keyed by property name. */
    properties: Record<string, NotionPropertyConfiguration>
    /** Framer field id used for the Notion title property. */
    titleFieldId: string
    /** Notion property name for the title column. */
    titlePropertyName: string
    /** Framer field id → Notion property name (mapped fields only). */
    fieldNameByFramerId: Record<string, string>
    warnings: string[]
}

const TITLE_NAME_HINTS = ["title", "name", "slug"]

const SKIPPED_TYPES: Record<string, string> = {
    image: "Images are not imported into Notion in v1",
    file: "Files are not imported into Notion in v1",
    collectionReference: "Collection references are not supported for Notion bootstrap",
    multiCollectionReference: "Collection references are not supported for Notion bootstrap",
    array: "Gallery/array fields are not supported for Notion bootstrap",
    divider: "Divider fields are not CMS data",
    unsupported: "Unsupported Framer field type",
}

function normalizeName(name: string): string {
    return name.trim().toLowerCase()
}

function uniquePropertyName(name: string, used: Set<string>): string {
    const base = name.trim() || "Field"
    if (!used.has(base)) {
        used.add(base)
        return base
    }
    let i = 2
    while (used.has(`${base} (${i})`)) i++
    const unique = `${base} (${i})`
    used.add(unique)
    return unique
}

/** Score how suitable a field is as the Notion title column (higher = better). */
export function scoreTitleFieldCandidate(field: FramerTemplateField): number {
    if (field.type !== "string" && field.type !== "formattedText") return -1

    const normalized = normalizeName(field.name)
    const hintIndex = TITLE_NAME_HINTS.indexOf(normalized)
    if (hintIndex >= 0) return 100 - hintIndex

    return field.type === "string" ? 10 : 5
}

export function pickTitleFieldId(
    fields: FramerTemplateField[],
    preferredId?: string
): string | null {
    if (preferredId) {
        const preferred = fields.find(f => f.id === preferredId)
        if (preferred && scoreTitleFieldCandidate(preferred) >= 0) {
            return preferred.id
        }
    }

    let best: FramerTemplateField | null = null
    let bestScore = -1

    for (const field of fields) {
        const score = scoreTitleFieldCandidate(field)
        if (score > bestScore) {
            best = field
            bestScore = score
        }
    }

    return best?.id ?? null
}

/**
 * Map one Framer CMS field to a Notion database property configuration.
 * Use `useAsTitle` for exactly one field when building a new Notion data source.
 */
export function mapFramerFieldToNotionProperty(
    field: FramerTemplateField,
    options?: { useAsTitle?: boolean }
): FramerToNotionMapResult {
    if (field.type === "divider") {
        return { status: "skipped", reason: SKIPPED_TYPES.divider }
    }

    const skipReason = SKIPPED_TYPES[field.type]
    if (skipReason) {
        return { status: "skipped", reason: skipReason }
    }

    if (options?.useAsTitle) {
        if (field.type !== "string" && field.type !== "formattedText") {
            return {
                status: "skipped",
                reason: "Only string or formatted text fields can be the Notion title",
            }
        }
        return { status: "mapped", notionType: "title", configuration: { title: {} } }
    }

    switch (field.type) {
        case "string":
        case "formattedText":
            return { status: "mapped", notionType: "rich_text", configuration: { rich_text: {} } }
        case "number":
            return {
                status: "mapped",
                notionType: "number",
                configuration: { number: { format: "number" } },
            }
        case "boolean":
            return { status: "mapped", notionType: "checkbox", configuration: { checkbox: {} } }
        case "date":
            return { status: "mapped", notionType: "date", configuration: { date: {} } }
        case "link":
            return { status: "mapped", notionType: "url", configuration: { url: {} } }
        case "enum": {
            const options =
                field.cases?.map(c => ({ name: c.name.trim() || c.id })).filter(c => c.name.length > 0) ??
                []
            if (options.length === 0) {
                return {
                    status: "skipped",
                    reason: `Enum field "${field.name}" has no options to map to Notion select`,
                }
            }
            return {
                status: "mapped",
                notionType: "select",
                configuration: { select: { options } },
            }
        }
        default:
            return { status: "skipped", reason: SKIPPED_TYPES.unsupported }
    }
}

/**
 * Build Notion `initial_data_source.properties` from Framer collection fields.
 */
export function buildNotionBootstrapSchema(
    fields: FramerTemplateField[],
    options?: { titleFieldId?: string }
): NotionBootstrapSchema {
    const warnings: string[] = []
    const properties: Record<string, NotionPropertyConfiguration> = {}
    const fieldNameByFramerId: Record<string, string> = {}
    const usedNames = new Set<string>()

    const titleFieldId = pickTitleFieldId(fields, options?.titleFieldId)
    if (!titleFieldId) {
        throw new Error("No suitable Framer field found for Notion title property")
    }

    const titleField = fields.find(f => f.id === titleFieldId)
    if (!titleField) {
        throw new Error(`Title field id "${titleFieldId}" not found`)
    }

    const titlePropertyName = uniquePropertyName(titleField.name, usedNames)
    properties[titlePropertyName] = { title: {} }
    fieldNameByFramerId[titleField.id] = titlePropertyName

    for (const field of fields) {
        if (field.id === titleFieldId) continue

        const mapped = mapFramerFieldToNotionProperty(field)
        if (mapped.status === "skipped") {
            warnings.push(`${field.name}: ${mapped.reason}`)
            continue
        }

        const propertyName = uniquePropertyName(field.name, usedNames)
        properties[propertyName] = mapped.configuration
        fieldNameByFramerId[field.id] = propertyName
    }

    return {
        properties,
        titleFieldId,
        titlePropertyName,
        fieldNameByFramerId,
        warnings,
    }
}
