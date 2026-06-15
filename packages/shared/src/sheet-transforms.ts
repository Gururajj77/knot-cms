import type { FieldMapping, FramerFieldType } from "./types.js"
import { slugify } from "./notion.js"
import {
    buildFramerFields,
    type FramerItemPayload,
} from "./transforms.js"

export type SheetColumnType = "string" | "number" | "boolean" | "date" | "url" | "image"

const URL_PATTERN = /^https?:\/\//i
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i

export function inferSheetColumnType(samples: string[]): SheetColumnType {
    const values = samples.map(v => v.trim()).filter(Boolean)
    if (values.length === 0) return "string"

    if (values.every(v => v.toUpperCase() === "TRUE" || v.toUpperCase() === "FALSE")) {
        return "boolean"
    }
    if (values.every(v => !Number.isNaN(Number(v)))) return "number"
    if (values.every(v => URL_PATTERN.test(v))) {
        return values.every(v => IMAGE_EXT.test(v)) ? "image" : "url"
    }
    if (values.every(v => !Number.isNaN(Date.parse(v)))) return "date"
    return "string"
}

export function defaultFramerTypeForSheetColumn(columnType: SheetColumnType): FramerFieldType {
    switch (columnType) {
        case "number":
            return "number"
        case "boolean":
            return "boolean"
        case "date":
            return "date"
        case "url":
            return "link"
        case "image":
            return "image"
        default:
            return "string"
    }
}

export function sheetHeadersToFieldMappings(
    headers: string[],
    sampleRows: string[][]
): FieldMapping[] {
    const mappings: FieldMapping[] = []
    headers.forEach((header, index) => {
        const name = header.trim() || `Column ${index + 1}`
        const samples = sampleRows.map(row => row[index] ?? "")
        const columnType = inferSheetColumnType(samples)
        const framerType = defaultFramerTypeForSheetColumn(columnType)
        const propertyId = `col_${index}`
        mappings.push({
            notionPropertyId: propertyId,
            notionPropertyName: name,
            notionPropertyType: columnType,
            framerFieldId: propertyId,
            framerFieldName: name,
            framerFieldType: framerType,
            ignored: false,
            contentType: framerType === "formattedText" ? "markdown" : undefined,
        })
    })
    return mappings
}

function parseSheetCell(value: string, mapping: FieldMapping): unknown {
    const trimmed = value.trim()
    if (!trimmed) return mapping.framerFieldType === "boolean" ? false : ""

    switch (mapping.framerFieldType) {
        case "number":
            return Number(trimmed)
        case "boolean":
            return trimmed.toUpperCase() === "TRUE"
        case "date":
            return trimmed
        case "link":
        case "image":
            return trimmed
        default:
            return trimmed
    }
}

export function sheetRowsToFramerItems(
    rows: string[][],
    mappings: FieldMapping[],
    slugPropertyId: string
): FramerItemPayload[] {
    if (rows.length < 2) return []

    const header = rows[0] ?? []
    const slugIndex = mappings.find(m => m.notionPropertyId === slugPropertyId)?.notionPropertyId
    const slugColIndex = slugIndex ? Number.parseInt(slugIndex.replace("col_", ""), 10) : 0

    const titleIndex = mappings.find(
        m => m.notionPropertyType === "string" && !m.ignored && m.notionPropertyId !== slugPropertyId
    )
    const titleColIndex = titleIndex
        ? Number.parseInt(titleIndex.notionPropertyId.replace("col_", ""), 10)
        : slugColIndex

    const items: FramerItemPayload[] = []
    for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
        const row = rows[rowIndex] ?? []
        if (row.every(cell => !cell?.trim())) continue

        const slugRaw = row[slugColIndex]?.trim()
        const titleRaw = row[titleColIndex]?.trim()
        const slug = slugify(slugRaw || titleRaw || `row-${rowIndex}`)

        const fieldData: FramerItemPayload["fieldData"] = {}
        for (const mapping of mappings) {
            if (mapping.ignored) continue
            const colIndex = Number.parseInt(mapping.notionPropertyId.replace("col_", ""), 10)
            const cell = row[colIndex] ?? ""
            const value = parseSheetCell(cell, mapping)
            if (mapping.notionPropertyId === slugPropertyId) {
                fieldData[mapping.framerFieldId] = { type: "string", value: slug }
                continue
            }
            fieldData[mapping.framerFieldId] = {
                type: mapping.framerFieldType,
                value,
                ...(mapping.contentType ? { contentType: mapping.contentType } : {}),
            }
        }

        items.push({
            id: `sheet-row-${rowIndex}`,
            slug,
            draft: false,
            fieldData,
        })
    }

    return items
}

export function buildSheetSyncPayload(
    rows: string[][],
    mappings: FieldMapping[],
    slugPropertyId: string,
    maxRows?: number | null
) {
    let items = sheetRowsToFramerItems(rows, mappings, slugPropertyId)
    if (typeof maxRows === "number" && items.length > maxRows) {
        items = items.slice(0, maxRows)
    }
    return {
        fields: buildFramerFields(mappings),
        items,
    }
}
