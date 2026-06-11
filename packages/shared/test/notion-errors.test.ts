import { describe, expect, it } from "vitest"
import { classifySyncError } from "../src/errors.js"
import { NotionApiError, userMessageForNotionApiError } from "../src/notion.js"

describe("userMessageForNotionApiError", () => {
    it("explains missing parent page access", () => {
        const message = userMessageForNotionApiError(
            404,
            JSON.stringify({
                object: "error",
                status: 404,
                code: "object_not_found",
                message: "Could not find page with ID: abc.",
            })
        )

        expect(message).toContain("parent page")
        expect(message).toContain("Share")
    })

    it("explains schema validation failures", () => {
        const message = userMessageForNotionApiError(
            400,
            JSON.stringify({
                object: "error",
                status: 400,
                code: "validation_error",
                message: "body.properties.Title.title should be defined",
            })
        )

        expect(message).toContain("schema")
    })
})

describe("classifySyncError for NotionApiError", () => {
    it("returns NOTION_API with user message", () => {
        const result = classifySyncError(
            new NotionApiError("Notion denied access.", 403, "restricted_resource")
        )

        expect(result.code).toBe("NOTION_API")
        expect(result.error).toBe("Notion denied access.")
    })
})
