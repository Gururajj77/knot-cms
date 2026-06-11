import { describe, expect, it } from "vitest"
import {
    buildNotionBootstrapSchema,
    mapFramerFieldToNotionProperty,
    pickTitleFieldId,
    scoreTitleFieldCandidate,
    type FramerTemplateField,
} from "../src/framer-to-notion-schema.js"

const fields: FramerTemplateField[] = [
    { id: "title", name: "Title", type: "string" },
    { id: "body", name: "Content", type: "formattedText" },
    { id: "mins", name: "Read time (min)", type: "number" },
    { id: "live", name: "Published", type: "boolean" },
    { id: "when", name: "Published Date", type: "date" },
    { id: "canonical", name: "Canonical URL", type: "link" },
    {
        id: "status",
        name: "Status",
        type: "enum",
        cases: [
            { id: "1", name: "Draft" },
            { id: "2", name: "Live" },
        ],
    },
    { id: "cover", name: "Cover", type: "image" },
    { id: "author", name: "Author", type: "collectionReference" },
]

describe("mapFramerFieldToNotionProperty", () => {
    it("maps string to rich_text by default", () => {
        const result = mapFramerFieldToNotionProperty({ id: "a", name: "Label", type: "string" })
        expect(result).toEqual({
            status: "mapped",
            notionType: "rich_text",
            configuration: { rich_text: {} },
        })
    })

    it("maps string to title when useAsTitle", () => {
        const result = mapFramerFieldToNotionProperty(
            { id: "a", name: "Title", type: "string" },
            { useAsTitle: true }
        )
        expect(result).toEqual({
            status: "mapped",
            notionType: "title",
            configuration: { title: {} },
        })
    })

    it("skips image fields", () => {
        const result = mapFramerFieldToNotionProperty({ id: "img", name: "Cover", type: "image" })
        expect(result.status).toBe("skipped")
        if (result.status === "skipped") {
            expect(result.reason).toContain("Images")
        }
    })

    it("maps enum to select with case names", () => {
        const result = mapFramerFieldToNotionProperty({
            id: "e",
            name: "Status",
            type: "enum",
            cases: [
                { id: "a", name: "New" },
                { id: "b", name: "Done" },
            ],
        })
        expect(result).toEqual({
            status: "mapped",
            notionType: "select",
            configuration: { select: { options: [{ name: "New" }, { name: "Done" }] } },
        })
    })

    it("skips enum without cases", () => {
        const result = mapFramerFieldToNotionProperty({ id: "e", name: "Status", type: "enum" })
        expect(result.status).toBe("skipped")
    })
})

describe("pickTitleFieldId", () => {
    it("prefers a field named Title", () => {
        expect(pickTitleFieldId(fields)).toBe("title")
    })

    it("uses preferred id when valid", () => {
        expect(pickTitleFieldId(fields, "body")).toBe("body")
    })

    it("falls back to first string-like field", () => {
        const minimal: FramerTemplateField[] = [
            { id: "cover", name: "Cover", type: "image" },
            { id: "note", name: "Notes", type: "formattedText" },
        ]
        expect(pickTitleFieldId(minimal)).toBe("note")
    })
})

describe("scoreTitleFieldCandidate", () => {
    it("ranks Name above generic string", () => {
        const titleScore = scoreTitleFieldCandidate({ id: "1", name: "Title", type: "string" })
        const bodyScore = scoreTitleFieldCandidate({ id: "2", name: "Body", type: "string" })
        expect(titleScore).toBeGreaterThan(bodyScore)
    })
})

describe("buildNotionBootstrapSchema", () => {
    it("builds properties for mappable fields and warns on skipped types", () => {
        const schema = buildNotionBootstrapSchema(fields)

        expect(schema.titleFieldId).toBe("title")
        expect(schema.titlePropertyName).toBe("Title")
        expect(schema.properties.Title).toEqual({ title: {} })
        expect(schema.properties.Content).toEqual({ rich_text: {} })
        expect(schema.properties["Read time (min)"]).toEqual({ number: { format: "number" } })
        expect(schema.properties.Published).toEqual({ checkbox: {} })
        expect(schema.properties["Published Date"]).toEqual({ date: {} })
        expect(schema.properties["Canonical URL"]).toEqual({ url: {} })
        expect(schema.properties.Status).toEqual({
            select: { options: [{ name: "Draft" }, { name: "Live" }] },
        })

        expect(schema.properties.Cover).toBeUndefined()
        expect(schema.properties.Author).toBeUndefined()
        expect(schema.warnings.some(w => w.includes("Cover"))).toBe(true)
        expect(schema.warnings.some(w => w.includes("Author"))).toBe(true)

        expect(schema.fieldNameByFramerId.title).toBe("Title")
        expect(schema.fieldNameByFramerId.body).toBe("Content")
    })

    it("dedupes colliding property names", () => {
        const duped: FramerTemplateField[] = [
            { id: "a", name: "Title", type: "string" },
            { id: "b", name: "Title", type: "string" },
        ]
        const schema = buildNotionBootstrapSchema(duped)
        expect(Object.keys(schema.properties).sort()).toEqual(["Title", "Title (2)"])
    })

    it("throws when no title candidate exists", () => {
        expect(() =>
            buildNotionBootstrapSchema([{ id: "n", name: "Count", type: "number" }])
        ).toThrow(/title/i)
    })
})
