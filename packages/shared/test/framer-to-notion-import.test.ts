import { describe, expect, it } from "vitest"
import { buildNotionBootstrapSchema } from "../src/framer-to-notion-schema.js"
import { framerItemToNotionProperties } from "../src/framer-to-notion-import.js"
import type { FramerTemplateField } from "../src/framer-to-notion-schema.js"

const fields: FramerTemplateField[] = [
    { id: "title", name: "Title", type: "string" },
    { id: "status", name: "Status", type: "enum", cases: [{ id: "draft", name: "Draft" }] },
    { id: "count", name: "Count", type: "number" },
]

describe("framerItemToNotionProperties", () => {
    it("maps Framer field data to Notion page properties", () => {
        const schema = buildNotionBootstrapSchema(fields)
        const properties = framerItemToNotionProperties(
            {
                id: "item_1",
                slug: "hello-world",
                fieldData: {
                    title: { type: "string", value: "Hello" },
                    status: { type: "enum", value: "draft" },
                    count: { type: "number", value: 3 },
                },
            },
            schema,
            fields
        )

        expect(properties?.Title).toEqual({
            title: [{ type: "text", text: { content: "Hello" } }],
        })
        expect(properties?.Status).toEqual({ select: { name: "Draft" } })
        expect(properties?.Count).toEqual({ number: 3 })
    })

    it("falls back to slug for title", () => {
        const schema = buildNotionBootstrapSchema(fields)
        const properties = framerItemToNotionProperties(
            {
                id: "item_2",
                slug: "from-slug",
                fieldData: {},
            },
            schema,
            fields
        )

        expect(properties?.Title).toEqual({
            title: [{ type: "text", text: { content: "from-slug" } }],
        })
    })
})
