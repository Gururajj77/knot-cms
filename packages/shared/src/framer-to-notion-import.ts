import type { NotionBootstrapSchema } from "./framer-to-notion-schema.js"
import type { FramerTemplateField } from "./framer-to-notion-schema.js"

/** Maximum Framer rows that can be imported in one bootstrap or re-import request. */
export const BOOTSTRAP_IMPORT_ROW_MAX = 500

/** @deprecated Use BOOTSTRAP_IMPORT_ROW_MAX */
export const BOOTSTRAP_IMPORT_ROW_LIMIT = BOOTSTRAP_IMPORT_ROW_MAX

/** Cache key segment when KnotCMS auto-creates the Notion parent page. */
export const BOOTSTRAP_AUTO_PARENT_PAGE_ID = "__auto__"

export type FramerItemFieldEntry = {
    type: string
    value: unknown
}

export type FramerCollectionItemLike = {
    id: string
    slug: string
    draft?: boolean
    fieldData: Record<string, FramerItemFieldEntry>
}

export type NotionPagePropertiesInput = Record<string, Record<string, unknown>>

function textContent(value: string): NotionPagePropertiesInput[string] {
    return { rich_text: [{ type: "text", text: { content: value.slice(0, 2000) } }] }
}

function titleContent(value: string): NotionPagePropertiesInput[string] {
    return { title: [{ type: "text", text: { content: value.slice(0, 2000) } }] }
}

function fieldById(fields: FramerTemplateField[], id: string): FramerTemplateField | undefined {
    return fields.find(f => f.id === id)
}

function enumOptionName(field: FramerTemplateField, caseId: string): string | null {
    if (field.type !== "enum" || !field.cases) return null
    const match = field.cases.find(c => c.id === caseId)
    return match?.name.trim() || null
}

function mapEntryToNotion(
    entry: FramerItemFieldEntry,
    framerField: FramerTemplateField,
    notionPropertyName: string,
    isTitle: boolean
): NotionPagePropertiesInput[string] | null {
    const value = entry.value

    if (isTitle) {
        const text =
            typeof value === "string"
                ? value
                : typeof value === "number"
                  ? String(value)
                  : ""
        const title = text.trim() || notionPropertyName
        return title ? titleContent(title) : null
    }

    switch (entry.type) {
        case "string":
        case "formattedText": {
            if (typeof value !== "string" || !value.trim()) return null
            return textContent(value)
        }
        case "number": {
            if (typeof value !== "number" || Number.isNaN(value)) return null
            return { number: value }
        }
        case "boolean":
            return { checkbox: Boolean(value) }
        case "date": {
            if (typeof value !== "string" || !value.trim()) return null
            return { date: { start: value } }
        }
        case "link": {
            if (typeof value !== "string" || !value.trim()) return null
            return { url: value }
        }
        case "enum": {
            if (typeof value !== "string" || !value.trim()) return null
            const name = enumOptionName(framerField, value)
            if (!name) return null
            return { select: { name } }
        }
        default:
            return null
    }
}

/**
 * Map one Framer CMS item to Notion page `properties` for POST /v1/pages.
 * Returns null when no title value can be resolved.
 */
export function framerItemToNotionProperties(
    item: FramerCollectionItemLike,
    schema: NotionBootstrapSchema,
    fields: FramerTemplateField[]
): NotionPagePropertiesInput | null {
    const properties: NotionPagePropertiesInput = {}

    for (const [framerFieldId, notionPropertyName] of Object.entries(schema.fieldNameByFramerId)) {
        const framerField = fieldById(fields, framerFieldId)
        if (!framerField) continue

        const entry = item.fieldData[framerFieldId]
        if (!entry) continue

        const isTitle = framerFieldId === schema.titleFieldId
        const mapped = mapEntryToNotion(entry, framerField, notionPropertyName, isTitle)
        if (mapped) {
            properties[notionPropertyName] = mapped
        }
    }

    const titleProp = properties[schema.titlePropertyName]
    if (!titleProp) {
        const fallback = item.slug.trim() || "Untitled"
        properties[schema.titlePropertyName] = titleContent(fallback)
    }

    return properties
}
