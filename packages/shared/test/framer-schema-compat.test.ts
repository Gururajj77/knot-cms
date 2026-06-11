import { describe, expect, it } from "vitest"
import { analyzeInPlaceSchemaCompatibility } from "../src/framer-fields.js"
import type { FieldMapping } from "../src/types.js"

const mapping = (name: string, framerName = name): FieldMapping => ({
    notionPropertyId: `id-${name}`,
    notionPropertyName: name,
    notionPropertyType: "rich_text",
    framerFieldId: framerName.replace(/\s/g, ""),
    framerFieldName: framerName,
    framerFieldType: "string",
})

describe("analyzeInPlaceSchemaCompatibility", () => {
    it("reports Notion fields that don't match Framer columns", () => {
        const result = analyzeInPlaceSchemaCompatibility(
            [mapping("Title", "Name"), mapping("Extra")],
            [{ id: "f1", name: "Name" }]
        )

        expect(result.matchedFieldCount).toBe(1)
        expect(result.unmappedNotionFields).toEqual(["Extra"])
        expect(result.untouchedFramerFields).toEqual([])
        expect(result.warnings.some(w => w.includes("Extra"))).toBe(true)
    })

    it("reports Framer columns that won't receive Notion updates", () => {
        const result = analyzeInPlaceSchemaCompatibility([mapping("Title", "Name")], [
            { id: "f1", name: "Name" },
            { id: "f2", name: "Legacy" },
        ])

        expect(result.untouchedFramerFields).toEqual(["Legacy"])
    })
})
