import { describe, expect, it } from "vitest"
import { planUserCollectionSync } from "../src/framer-fields.js"
import type { FramerItemPayload } from "../src/transforms.js"

const sampleItem = (id: string, slug: string): FramerItemPayload => ({
    id,
    slug,
    draft: false,
    fieldData: { title: { type: "string", value: slug } },
})

describe("planUserCollectionSync", () => {
    it("reuses Framer item ids for existing slugs instead of Notion page ids", () => {
        const plan = planUserCollectionSync(
            [sampleItem("notion-page-uuid", "first")],
            [{ id: "framer-item-1", slug: "first" }]
        )

        expect(plan.items).toEqual([
            {
                slug: "first",
                draft: false,
                fieldData: { title: { type: "string", value: "first" } },
                id: "framer-item-1",
            },
        ])
        expect(plan.idsToRemove).toEqual([])
    })

    it("omits id for new Notion rows", () => {
        const plan = planUserCollectionSync(
            [sampleItem("notion-page-uuid", "new-post")],
            [{ id: "framer-item-1", slug: "first" }]
        )

        expect(plan.items[0]).not.toHaveProperty("id")
        expect(plan.items[0]?.slug).toBe("new-post")
        expect(plan.idsToRemove).toEqual(["framer-item-1"])
    })

    it("matches slugs case-insensitively", () => {
        const plan = planUserCollectionSync(
            [sampleItem("notion-page-uuid", "First")],
            [{ id: "framer-item-1", slug: "first" }]
        )

        expect(plan.items[0]?.id).toBe("framer-item-1")
        expect(plan.idsToRemove).toEqual([])
    })
})
