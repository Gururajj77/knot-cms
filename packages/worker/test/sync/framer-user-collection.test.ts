import { describe, expect, it, vi, afterEach, beforeEach } from "vitest"
import type { FieldMapping } from "@knotcms/shared"
import type { Collection } from "framer-api"
import {
    ensureUserCollectionFields,
    fieldMappingsToCreateFields,
    findOrCreateUserCollection,
    syncToUserCollection,
} from "../../src/sync/framerCollection.js"

const sampleMappings: FieldMapping[] = [
    {
        notionPropertyId: "title",
        notionPropertyName: "Title",
        notionPropertyType: "title",
        framerFieldId: "title",
        framerFieldName: "Name",
        framerFieldType: "string",
    },
    {
        notionPropertyId: "status",
        notionPropertyName: "Status",
        notionPropertyType: "select",
        framerFieldId: "status",
        framerFieldName: "Status",
        framerFieldType: "enum",
        enumCaseMap: { opt_a: "Draft", opt_b: "Live" },
    },
]

function makeUserCollection(overrides: Partial<Collection> = {}): Collection {
    return {
        id: "col_user",
        name: "Blog",
        managedBy: "user",
        slugFieldName: null,
        slugFieldBasedOn: null,
        readonly: false,
        getFields: vi.fn().mockResolvedValue([]),
        addFields: vi.fn().mockResolvedValue([
            { id: "f_title", name: "Name", type: "string" },
            { id: "f_status", name: "Status", type: "enum" },
        ]),
        getItems: vi.fn().mockResolvedValue([]),
        addItems: vi.fn().mockResolvedValue(undefined),
        removeItems: vi.fn().mockResolvedValue(undefined),
        ...overrides,
    } as unknown as Collection
}

describe("fieldMappingsToCreateFields", () => {
    it("maps string and enum fields for createCollection addFields", () => {
        expect(fieldMappingsToCreateFields(sampleMappings)).toEqual([
            { type: "string", name: "Name" },
            {
                type: "enum",
                name: "Status",
                cases: [{ name: "Draft" }, { name: "Live" }],
            },
        ])
    })

    it("skips ignored mappings", () => {
        const fields = fieldMappingsToCreateFields([
            { ...sampleMappings[0]!, ignored: true },
            sampleMappings[1]!,
        ])
        expect(fields).toEqual([
            {
                type: "enum",
                name: "Status",
                cases: [{ name: "Draft" }, { name: "Live" }],
            },
        ])
    })
})

describe("findOrCreateUserCollection", () => {
    beforeEach(() => {
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it("returns an existing user collection by name", async () => {
        const existing = makeUserCollection()
        const framer = {
            getCollections: vi.fn().mockResolvedValue([existing]),
            createCollection: vi.fn(),
        }

        const result = await findOrCreateUserCollection(
            framer as unknown as Awaited<ReturnType<typeof import("framer-api").connect>>,
            "Blog"
        )

        expect(result).toBe(existing)
        expect(framer.createCollection).not.toHaveBeenCalled()
    })

    it("creates a user collection when none exists", async () => {
        const created = makeUserCollection({ name: "Blog" })
        const framer = {
            getCollections: vi
                .fn()
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([])
                .mockResolvedValue([created]),
            createCollection: vi.fn().mockResolvedValue(created),
        }

        const promise = findOrCreateUserCollection(
            framer as unknown as Awaited<ReturnType<typeof import("framer-api").connect>>,
            "Blog"
        )
        await vi.runAllTimersAsync()
        const result = await promise

        expect(framer.createCollection).toHaveBeenCalledWith("Blog")
        expect(result).toBe(created)
    })
})

describe("ensureUserCollectionFields", () => {
    it("adds mapped fields to an empty collection", async () => {
        const collection = makeUserCollection()

        await ensureUserCollectionFields(collection, sampleMappings)

        expect(collection.addFields).toHaveBeenCalledWith([
            { type: "string", name: "Name" },
            {
                type: "enum",
                name: "Status",
                cases: [{ name: "Draft" }, { name: "Live" }],
            },
        ])
    })

    it("preserves an existing schema", async () => {
        const collection = makeUserCollection({
            getFields: vi.fn().mockResolvedValue([{ id: "f1", name: "Name", type: "string" }]),
        })

        await ensureUserCollectionFields(collection, sampleMappings)

        expect(collection.addFields).not.toHaveBeenCalled()
    })
})

describe("syncToUserCollection", () => {
    it("upserts items into a user-managed collection", async () => {
        const collection = makeUserCollection({
            getFields: vi.fn().mockResolvedValue([{ id: "f_title", name: "Name", type: "string" }]),
        })
        const framer = {
            getCollection: vi.fn().mockResolvedValue(collection),
        }

        const result = await syncToUserCollection(
            framer as unknown as Awaited<ReturnType<typeof import("framer-api").connect>>,
            "col_user",
            sampleMappings,
            [
                {
                    id: "page-1",
                    slug: "hello",
                    draft: false,
                    fieldData: {
                        title: { type: "string", value: "Hello" },
                    },
                },
            ]
        )

        expect(result.itemsSynced).toBe(1)
        expect(collection.addItems).toHaveBeenCalled()
    })

    it("rejects non-user collections", async () => {
        const collection = makeUserCollection({ managedBy: "thisPlugin" })
        const framer = {
            getCollection: vi.fn().mockResolvedValue(collection),
        }

        await expect(
            syncToUserCollection(
                framer as unknown as Awaited<ReturnType<typeof import("framer-api").connect>>,
                "col_plugin",
                sampleMappings,
                []
            )
        ).rejects.toThrow(/managed collection API/)
    })
})
