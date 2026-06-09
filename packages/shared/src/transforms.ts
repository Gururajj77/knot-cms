import type { FieldMapping, FramerFieldType } from "./types.js"
import {
    extractPlainText,
    slugify,
    type NotionPage,
    type NotionPropertyValue,
} from "./notion.js"

export interface FramerFieldDefinition {
    id: string
    name: string
    type: FramerFieldType
    cases?: Array<{ id: string; name: string }>
}

export interface FramerItemPayload {
    id: string
    slug: string
    draft: boolean
    fieldData: Record<string, { type: string; value: unknown; contentType?: string }>
}

const NOTION_TO_FRAMER_DEFAULT: Record<string, FramerFieldType> = {
    title: "string",
    unique_id: "string",
    rich_text: "formattedText",
    number: "number",
    checkbox: "boolean",
    select: "enum",
    status: "enum",
    date: "date",
    url: "link",
    email: "string",
    phone_number: "string",
    files: "image",
}

export function defaultFramerTypeForNotion(notionType: string): FramerFieldType | null {
    return NOTION_TO_FRAMER_DEFAULT[notionType] ?? null
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

export function buildFramerFields(mappings: FieldMapping[]): FramerFieldDefinition[] {
    return mappings
        .filter(m => !m.ignored)
        .map(m => {
            const field: FramerFieldDefinition = {
                id: m.framerFieldId,
                name: m.framerFieldName,
                type: m.framerFieldType,
            }
            if (m.framerFieldType === "enum" && m.enumCaseMap) {
                field.cases = Object.entries(m.enumCaseMap).map(([id, name]) => ({ id, name }))
            }
            return field
        })
}

function transformPropertyValue(
    prop: NotionPropertyValue | undefined,
    mapping: FieldMapping
): { type: string; value: unknown; contentType?: string } | null {
    if (!prop) return null

    switch (mapping.framerFieldType) {
        case "string": {
            const text = extractPlainText(prop)
            return { type: "string", value: text }
        }
        case "formattedText": {
            const text = extractPlainText(prop)
            return {
                type: "formattedText",
                value: text,
                contentType: mapping.contentType ?? "markdown",
            }
        }
        case "number":
            if (prop.type === "number") {
                return { type: "number", value: prop.number ?? 0 }
            }
            return null
        case "boolean":
            if (prop.type === "checkbox") {
                return { type: "boolean", value: prop.checkbox }
            }
            return null
        case "date": {
            if (prop.type === "date") {
                const dateProp = prop as Extract<typeof prop, { type: "date" }>
                if (dateProp.date?.start) {
                    return { type: "date", value: dateProp.date.start }
                }
            }
            return null
        }
        case "link":
            if (prop.type === "url" && prop.url) {
                return { type: "link", value: prop.url }
            }
            return { type: "link", value: extractPlainText(prop) }
        case "image": {
            if (prop.type === "files") {
                const filesProp = prop as Extract<typeof prop, { type: "files" }>
                if (filesProp.files.length > 0) {
                    const file = filesProp.files[0]
                    const url = file?.file?.url ?? file?.external?.url
                    if (url) return { type: "image", value: url }
                }
            }
            return null
        }
        case "enum": {
            let name: string | null = null
            if (prop.type === "select") {
                const sel = prop as Extract<typeof prop, { type: "select" }>
                if (sel.select) name = sel.select.name
            }
            if (prop.type === "status") {
                const st = prop as Extract<typeof prop, { type: "status" }>
                if (st.status) name = st.status.name
            }
            if (!name) return null
            const caseId = mapping.enumCaseMap?.[name] ?? slugify(name)
            return { type: "enum", value: caseId }
        }
        default:
            return null
    }
}

export function notionPagesToFramerItems(
    pages: NotionPage[],
    mappings: FieldMapping[],
    slugNotionPropertyId: string
): FramerItemPayload[] {
    const activeMappings = mappings.filter(m => !m.ignored)
    const slugMapping = activeMappings.find(m => m.notionPropertyId === slugNotionPropertyId)

    const items: FramerItemPayload[] = []

    for (const page of pages) {
        let slug = slugify(page.id.replace(/-/g, "").slice(0, 12))

        if (slugMapping) {
            const slugProp = page.properties[slugMapping.notionPropertyName]
            const slugText = transformPropertyValue(slugProp, slugMapping)
            if (slugText && typeof slugText.value === "string" && slugText.value.trim()) {
                slug = slugify(slugText.value)
            }
        } else {
            const titleProp = Object.values(page.properties).find(p => p.type === "title")
            if (titleProp) {
                const t = extractPlainText(titleProp)
                if (t) slug = slugify(t)
            }
        }

        const fieldData: FramerItemPayload["fieldData"] = {}
        for (const mapping of activeMappings) {
            if (mapping.notionPropertyId === slugNotionPropertyId) {
                fieldData[mapping.framerFieldId] = { type: "string", value: slug }
                continue
            }
            const prop = page.properties[mapping.notionPropertyName]
            const transformed = transformPropertyValue(prop, mapping)
            if (transformed) {
                fieldData[mapping.framerFieldId] = transformed
            }
        }

        items.push({
            id: page.id,
            slug,
            draft: false,
            fieldData,
        })
    }

    return items
}
