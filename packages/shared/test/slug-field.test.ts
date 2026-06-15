import { describe, expect, it } from "vitest"
import { isSlugEligibleFieldMapping } from "../src/slug-field.js"
import type { FieldMapping } from "../src/types.js"

function mapping(overrides: Partial<FieldMapping>): FieldMapping {
    return {
        notionPropertyId: "col_0",
        notionPropertyName: "Content",
        notionPropertyType: "url",
        framerFieldId: "col_0",
        framerFieldName: "Content",
        framerFieldType: "link",
        ignored: false,
        ...overrides,
    }
}

describe("isSlugEligibleFieldMapping", () => {
    it("treats sheet URL columns as slug-eligible", () => {
        expect(isSlugEligibleFieldMapping(mapping({}), "google_sheets")).toBe(true)
    })

    it("treats notion title columns as slug-eligible", () => {
        expect(
            isSlugEligibleFieldMapping(
                mapping({
                    notionPropertyType: "title",
                    framerFieldType: "string",
                }),
                "notion"
            )
        ).toBe(true)
    })
})
