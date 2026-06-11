import type { NotionBootstrapSchema } from "./framer-to-notion-schema.js"
import type { FramerTemplateField } from "./framer-to-notion-schema.js"
import { defaultFramerTypeForNotion } from "./transforms.js"
import type { FieldMapping } from "./types.js"

/** Field mappings for a database bootstrapped from Framer (preserves Framer field ids). */
export function bootstrapPropertiesToFieldMappings(
    properties: Array<{ id: string; name: string; type: string }>,
    schema: NotionBootstrapSchema,
    framerFields: FramerTemplateField[]
): FieldMapping[] {
    const framerByNotionName = new Map<string, FramerTemplateField>()
    for (const [framerId, notionName] of Object.entries(schema.fieldNameByFramerId)) {
        const field = framerFields.find(f => f.id === framerId)
        if (field) framerByNotionName.set(notionName, field)
    }

    const mappings: FieldMapping[] = []

    for (const prop of properties) {
        const framerType = defaultFramerTypeForNotion(prop.type)
        if (!framerType) continue

        const framerField = framerByNotionName.get(prop.name)
        const mapping: FieldMapping = {
            notionPropertyId: prop.id,
            notionPropertyName: prop.name,
            notionPropertyType: prop.type,
            framerFieldId: (framerField?.id ?? prop.id).replace(/-/g, "").slice(0, 64),
            framerFieldName: framerField?.name ?? prop.name,
            framerFieldType: framerType,
            ignored: false,
            contentType: framerType === "formattedText" ? "markdown" : undefined,
        }

        if (framerType === "enum" && framerField?.type === "enum" && framerField.cases?.length) {
            mapping.enumCaseMap = Object.fromEntries(
                framerField.cases.map(c => [c.name.trim() || c.id, c.id])
            )
        }

        mappings.push(mapping)
    }

    return mappings
}
