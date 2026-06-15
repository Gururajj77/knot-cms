import { describe, expect, it } from "vitest"
import { alignItemsToFramerFields } from "../src/framer-fields.js"
import { classifySyncError, displaySyncError, userMessageForCode } from "../src/errors.js"
import type { FramerItemPayload } from "../src/transforms.js"
import type { FieldMapping } from "../src/types.js"

describe("classifySyncError", () => {
    it("classifies Framer field mismatch without exposing raw payload", () => {
        const raw =
            '{ index: 0, id: "83a18775-bc7f-4629-8fea-63fd91701fcf", slug: "cicd-for-monorepos" } - Field not found for key: Ubhl'
        const result = classifySyncError(new Error(raw))

        expect(result.code).toBe("FRAMER_FIELD_MISMATCH")
        expect(result.error).not.toContain("Ubhl")
        expect(result.error).not.toContain("index:")
        expect(result.details).toMatchObject({ fieldKey: "Ubhl", slug: "cicd-for-monorepos" })
    })

    it("does not leak raw message for unknown errors", () => {
        const result = classifySyncError(new Error("some internal stack trace xyz"))
        expect(result.code).toBe("UNKNOWN")
        expect(result.error).toBe(userMessageForCode("UNKNOWN"))
        expect(result.error).not.toContain("stack trace")
    })

    it("classifies invalid parent page messages", () => {
        const result = classifySyncError(
            new Error("Invalid Notion parent page ID or URL. Search for the page in the picker.")
        )
        expect(result.code).toBe("NOTION_API")
        expect(result.error).toContain("parent page")
    })

    it("classifies Framer asset upload failures", () => {
        const result = classifySyncError(
            new Error(
                "Assets upload from URL https://i.imgur.com/m9qRcMj.jpeg failed. Could not get asset, response code 429"
            )
        )
        expect(result.code).toBe("FRAMER_ASSET")
        expect(result.error).toContain("image URLs")
    })
})

describe("displaySyncError", () => {
    it("uses code for stored errors", () => {
        const message = displaySyncError({
            lastError: "raw should not show",
            lastErrorCode: "FRAMER_FIELD_MISMATCH",
        })
        expect(message).not.toContain("raw should not show")
        expect(message).toContain("Framer CMS")
    })
})

describe("alignItemsToFramerFields", () => {
    it("remaps fieldData keys to Framer collection field ids by name", () => {
        const mappings: FieldMapping[] = [
            {
                notionPropertyId: "n1",
                notionPropertyName: "Title",
                notionPropertyType: "title",
                framerFieldId: "oldtitleid",
                framerFieldName: "Title",
                framerFieldType: "string",
                ignored: false,
            },
        ]
        const items: FramerItemPayload[] = [
            {
                id: "page-1",
                slug: "hello",
                draft: false,
                fieldData: {
                    oldtitleid: { type: "string", value: "Hello" },
                },
            },
        ]

        const aligned = alignItemsToFramerFields(items, mappings, [{ id: "Ubhl", name: "Title" }])

        expect(aligned[0].fieldData.Ubhl).toEqual({ type: "string", value: "Hello" })
        expect(aligned[0].fieldData.oldtitleid).toBeUndefined()
    })
})
