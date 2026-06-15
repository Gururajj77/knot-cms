import { describe, expect, it } from "vitest"
import { buildSheetSyncPayload, sheetHeadersToFieldMappings, sheetRowsToFramerItems } from "../src/sheet-transforms.js"

describe("sheet-transforms", () => {
    it("maps headers to field mappings", () => {
        const mappings = sheetHeadersToFieldMappings(["Title", "Count"], [["Hello", "1"], ["World", "2"]])
        expect(mappings).toHaveLength(2)
        expect(mappings[0]?.notionPropertyName).toBe("Title")
        expect(mappings[1]?.framerFieldType).toBe("number")
    })

    it("builds framer items from sheet rows", () => {
        const rows = [
            ["Slug", "Title"],
            ["hello-world", "Hello"],
            ["second-post", "Second"],
        ]
        const mappings = sheetHeadersToFieldMappings(rows[0]!, [])
        const slugId = mappings[0]!.notionPropertyId
        const items = sheetRowsToFramerItems(rows, mappings, slugId)
        expect(items).toHaveLength(2)
        expect(items[0]?.slug).toBe("hello-world")
    })

    it("respects row cap in buildSheetSyncPayload", () => {
        const rows = [
            ["Slug", "Title"],
            ["a", "A"],
            ["b", "B"],
            ["c", "C"],
        ]
        const mappings = sheetHeadersToFieldMappings(rows[0]!, [])
        const payload = buildSheetSyncPayload(rows, mappings, mappings[0]!.notionPropertyId, 2)
        expect(payload.items).toHaveLength(2)
    })
})
