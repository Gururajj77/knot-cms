import { describe, expect, it } from "vitest"
import {
    defaultSlugPropertyId,
    isSlugEligibleFieldMapping,
    slugFieldOptions,
    slugTextFromTransformedValue,
} from "../src/slug-field.js"
import { notionPagesToFramerItems } from "../src/transforms.js"
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

describe("slugFieldOptions", () => {
    it("includes every active mapped field", () => {
        const options = slugFieldOptions(
            [
                mapping({ notionPropertyName: "Title", notionPropertyType: "title", framerFieldType: "string" }),
                mapping({
                    notionPropertyName: "Notes",
                    notionPropertyType: "rich_text",
                    framerFieldType: "formattedText",
                }),
                mapping({
                    notionPropertyName: "Amount",
                    notionPropertyType: "number",
                    framerFieldType: "number",
                }),
            ],
            "notion"
        )

        expect(options.map(option => option.notionPropertyName)).toEqual([
            "Title",
            "Notes",
            "Amount",
        ])
    })

    it("excludes ignored fields", () => {
        const options = slugFieldOptions(
            [
                mapping({ notionPropertyId: "a", notionPropertyName: "Title" }),
                mapping({ notionPropertyId: "b", notionPropertyName: "Hidden" }),
            ],
            "notion",
            new Set(["b"])
        )

        expect(options.map(option => option.notionPropertyName)).toEqual(["Title"])
    })
})

describe("defaultSlugPropertyId", () => {
    it("prefers the title field when present", () => {
        expect(
            defaultSlugPropertyId(
                [
                    mapping({ notionPropertyId: "notes", notionPropertyName: "Notes" }),
                    mapping({
                        notionPropertyId: "title",
                        notionPropertyName: "Name",
                        notionPropertyType: "title",
                        framerFieldType: "string",
                    }),
                ],
                "notion"
            )
        ).toBe("title")
    })
})

describe("slugTextFromTransformedValue", () => {
    it("coerces numbers and booleans into slug text", () => {
        expect(slugTextFromTransformedValue({ value: 42 })).toBe("42")
        expect(slugTextFromTransformedValue({ value: true })).toBe("true")
        expect(slugTextFromTransformedValue({ value: " Hello " })).toBe("Hello")
    })
})

describe("notionPagesToFramerItems slug selection", () => {
    it("builds the item slug from a selected number field", () => {
        const items = notionPagesToFramerItems(
            [
                {
                    id: "page-1",
                    last_edited_time: "2026-07-11T00:00:00.000Z",
                    properties: {
                        Expense: { type: "title", title: [{ plain_text: "Train ticket" }] },
                        Amount: { type: "number", number: 42.5 },
                    },
                },
            ],
            [
                mapping({
                    notionPropertyId: "title",
                    notionPropertyName: "Expense",
                    notionPropertyType: "title",
                    framerFieldId: "title",
                    framerFieldName: "Expense",
                    framerFieldType: "string",
                }),
                mapping({
                    notionPropertyId: "amount",
                    notionPropertyName: "Amount",
                    notionPropertyType: "number",
                    framerFieldId: "amount",
                    framerFieldName: "Amount",
                    framerFieldType: "number",
                }),
            ],
            "amount"
        )

        expect(items[0]?.slug).toBe("425")
    })

    it("builds the item slug from a selected boolean field", () => {
        const items = notionPagesToFramerItems(
            [
                {
                    id: "page-1",
                    last_edited_time: "2026-07-11T00:00:00.000Z",
                    properties: {
                        Paid: { type: "checkbox", checkbox: true },
                    },
                },
            ],
            [
                mapping({
                    notionPropertyId: "paid",
                    notionPropertyName: "Paid",
                    notionPropertyType: "checkbox",
                    framerFieldId: "paid",
                    framerFieldName: "Paid",
                    framerFieldType: "boolean",
                }),
            ],
            "paid"
        )

        expect(items[0]?.slug).toBe("true")
    })
})
