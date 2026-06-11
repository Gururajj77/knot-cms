import { describe, expect, it } from "vitest"
import { bootstrapPropertiesToFieldMappings } from "../src/bootstrap-mappings.js"
import { buildNotionBootstrapSchema } from "../src/framer-to-notion-schema.js"

describe("bootstrapPropertiesToFieldMappings", () => {
    it("preserves Framer field ids for sync mappings", () => {
        const fields = [
            { id: "fld_title", name: "Title", type: "string" as const },
            {
                id: "fld_status",
                name: "Status",
                type: "enum" as const,
                cases: [{ id: "live", name: "Live" }],
            },
        ]
        const schema = buildNotionBootstrapSchema(fields)
        const mappings = bootstrapPropertiesToFieldMappings(
            [
                { id: "prop-title", name: "Title", type: "title" },
                { id: "prop-status", name: "Status", type: "select" },
            ],
            schema,
            fields
        )

        expect(mappings).toHaveLength(2)
        expect(mappings[0]?.framerFieldId).toBe("fld_title")
        expect(mappings[1]?.enumCaseMap).toEqual({ Live: "live" })
    })
})
