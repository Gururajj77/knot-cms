import type { z } from "zod"
import { buildNotionBootstrapSchema, type FramerTemplateField, type FramerTemplateFieldType } from "./framer-to-notion-schema.js"
import { VerifyFramerCredentialsSchema } from "./types.js"

/** Framer Server API `Collection.managedBy` values. */
export type FramerCollectionManagedBy = "user" | "thisPlugin" | "anotherPlugin"

export const ListFramerCollectionsSchema = VerifyFramerCredentialsSchema
export type ListFramerCollectionsInput = z.infer<typeof ListFramerCollectionsSchema>

export interface FramerCollectionFieldSummary {
    id: string
    name: string
    type: FramerTemplateFieldType
    cases?: Array<{ id: string; name: string }>
}

export interface FramerCollectionBootstrapPreview {
    eligible: boolean
    mappedFieldCount: number
    skippedFieldCount: number
    titleFieldId: string | null
    warnings: string[]
    ineligibleReason?: string
}

export interface FramerCollectionSummary {
    id: string
    name: string
    managedBy: FramerCollectionManagedBy
    /** Whether this collection can seed a new Notion database in setup. */
    canUseAsTemplate: boolean
    itemCount: number
    fields: FramerCollectionFieldSummary[]
    bootstrapPreview: FramerCollectionBootstrapPreview
}

export interface ListFramerCollectionsResponse {
    collections: FramerCollectionSummary[]
}

const TEMPLATE_FIELD_TYPES = new Set<FramerTemplateFieldType>([
    "string",
    "number",
    "boolean",
    "formattedText",
    "date",
    "link",
    "image",
    "enum",
    "file",
    "collectionReference",
    "multiCollectionReference",
    "array",
    "divider",
    "unsupported",
])

export function canUseFramerCollectionAsTemplate(managedBy: FramerCollectionManagedBy): boolean {
    return managedBy !== "anotherPlugin"
}

export function normalizeFramerFieldType(type: string): FramerTemplateFieldType {
    if (TEMPLATE_FIELD_TYPES.has(type as FramerTemplateFieldType)) {
        return type as FramerTemplateFieldType
    }
    return "unsupported"
}

export type FramerFieldLike = {
    id: string
    name: string
    type: string
    cases?: ReadonlyArray<{ id: string; name: string }>
}

export function framerFieldToTemplateField(field: FramerFieldLike): FramerTemplateField {
    const type = normalizeFramerFieldType(field.type)
    if (type !== "enum" || !field.cases?.length) {
        return { id: field.id, name: field.name, type }
    }

    return {
        id: field.id,
        name: field.name,
        type,
        cases: field.cases.map(c => ({ id: c.id, name: c.name })),
    }
}

export function buildFramerCollectionBootstrapPreview(
    fields: FramerTemplateField[],
    canUseAsTemplate: boolean
): FramerCollectionBootstrapPreview {
    if (!canUseAsTemplate) {
        return {
            eligible: false,
            mappedFieldCount: 0,
            skippedFieldCount: fields.filter(f => f.type !== "divider").length,
            titleFieldId: null,
            warnings: [],
            ineligibleReason: "Collections managed by another plugin cannot be used as a template",
        }
    }

    const mappableFields = fields.filter(f => f.type !== "divider")

    try {
        const schema = buildNotionBootstrapSchema(mappableFields)
        return {
            eligible: true,
            mappedFieldCount: Object.keys(schema.fieldNameByFramerId).length,
            skippedFieldCount: schema.warnings.length,
            titleFieldId: schema.titleFieldId,
            warnings: schema.warnings,
        }
    } catch (error) {
        return {
            eligible: false,
            mappedFieldCount: 0,
            skippedFieldCount: mappableFields.length,
            titleFieldId: null,
            warnings: [],
            ineligibleReason:
                error instanceof Error
                    ? error.message
                    : "Cannot build Notion schema from this collection",
        }
    }
}

export function buildFramerCollectionSummary(input: {
    id: string
    name: string
    managedBy: FramerCollectionManagedBy
    itemCount: number
    fields: FramerTemplateField[]
}): FramerCollectionSummary {
    const canUseAsTemplate = canUseFramerCollectionAsTemplate(input.managedBy)

    return {
        id: input.id,
        name: input.name,
        managedBy: input.managedBy,
        canUseAsTemplate,
        itemCount: input.itemCount,
        fields: input.fields.map(field => ({
            id: field.id,
            name: field.name,
            type: field.type,
            ...(field.cases ? { cases: field.cases } : {}),
        })),
        bootstrapPreview: buildFramerCollectionBootstrapPreview(input.fields, canUseAsTemplate),
    }
}
