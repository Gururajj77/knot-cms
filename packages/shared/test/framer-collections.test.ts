import { describe, expect, it } from "vitest"
import {
    buildFramerCollectionBootstrapPreview,
    buildFramerCollectionSummary,
    canUseFramerCollectionAsTemplate,
    framerFieldToTemplateField,
    normalizeFramerFieldType,
} from "../src/framer-collections.js"

describe("canUseFramerCollectionAsTemplate", () => {
    it("allows user and thisPlugin collections", () => {
        expect(canUseFramerCollectionAsTemplate("user")).toBe(true)
        expect(canUseFramerCollectionAsTemplate("thisPlugin")).toBe(true)
    })

    it("blocks anotherPlugin collections", () => {
        expect(canUseFramerCollectionAsTemplate("anotherPlugin")).toBe(false)
    })
})

describe("framerFieldToTemplateField", () => {
    it("maps enum cases", () => {
        expect(
            framerFieldToTemplateField({
                id: "status",
                name: "Status",
                type: "enum",
                cases: [{ id: "1", name: "Draft" }],
            })
        ).toEqual({
            id: "status",
            name: "Status",
            type: "enum",
            cases: [{ id: "1", name: "Draft" }],
        })
    })

    it("normalizes unknown field types to unsupported", () => {
        expect(framerFieldToTemplateField({ id: "c", name: "Color", type: "color" }).type).toBe(
            "unsupported"
        )
        expect(normalizeFramerFieldType("color")).toBe("unsupported")
    })
})

describe("buildFramerCollectionBootstrapPreview", () => {
    it("marks anotherPlugin collections ineligible", () => {
        const preview = buildFramerCollectionBootstrapPreview(
            [{ id: "title", name: "Title", type: "string" }],
            false
        )

        expect(preview.eligible).toBe(false)
        expect(preview.ineligibleReason).toContain("another plugin")
    })

    it("returns mapped counts for eligible collections", () => {
        const preview = buildFramerCollectionBootstrapPreview(
            [
                { id: "title", name: "Title", type: "string" },
                { id: "cover", name: "Cover", type: "image" },
            ],
            true
        )

        expect(preview.eligible).toBe(true)
        expect(preview.mappedFieldCount).toBe(1)
        expect(preview.skippedFieldCount).toBe(1)
        expect(preview.titleFieldId).toBe("title")
    })
})

describe("buildFramerCollectionSummary", () => {
    it("builds a full collection summary", () => {
        const summary = buildFramerCollectionSummary({
            id: "col_1",
            name: "Blog",
            managedBy: "user",
            itemCount: 3,
            fields: [
                { id: "title", name: "Title", type: "string" },
                { id: "body", name: "Body", type: "formattedText" },
            ],
        })

        expect(summary).toMatchObject({
            id: "col_1",
            name: "Blog",
            managedBy: "user",
            canUseAsTemplate: true,
            itemCount: 3,
            fields: [
                { id: "title", name: "Title", type: "string" },
                { id: "body", name: "Body", type: "formattedText" },
            ],
        })
        expect(summary.bootstrapPreview.eligible).toBe(true)
    })
})
