import type { FieldMapping } from "./types.js"
import { defaultFramerTypeForNotion } from "./transforms.js"
import { normalizeFramerFieldType } from "./framer-collections.js"
import type { FramerTemplateField } from "./framer-to-notion-schema.js"

type FramerFieldHint = Pick<FramerTemplateField, "id" | "name" | "type"> | {
    id: string
    name: string
    type: string
}

function normalizeFieldName(name: string): string {
    return name.trim().toLowerCase()
}

/** Prefer Framer CMS field ids/names when linking an existing Framer collection to Notion. */
export function applyFramerCollectionFieldHints(
    mappings: FieldMapping[],
    framerFields: FramerFieldHint[]
): FieldMapping[] {
    const byName = new Map(
        framerFields.map(field => [
            normalizeFieldName(field.name),
            { ...field, type: normalizeFramerFieldType(field.type) },
        ])
    )

    return mappings.map(mapping => {
        const notionType = defaultFramerTypeForNotion(mapping.notionPropertyType)
        if (!notionType) return mapping

        const match =
            byName.get(normalizeFieldName(mapping.notionPropertyName)) ??
            byName.get(normalizeFieldName(mapping.framerFieldName))

        if (!match) return mapping

        const fieldType = normalizeFramerFieldType(match.type)
        if (fieldType === "divider" || fieldType === "unsupported") {
            return mapping
        }

        return {
            ...mapping,
            framerFieldId: match.id.replace(/-/g, "").slice(0, 64),
            framerFieldName: match.name,
            framerFieldType: notionType,
        }
    })
}
