import { describe, expect, it } from "vitest"
import { managedCollectionSyncName, userCollectionSyncName } from "../src/framer-sync-name.js"

describe("managedCollectionSyncName", () => {
    it("appends KnotCMS suffix", () => {
        expect(managedCollectionSyncName("Blog")).toBe("Blog · KnotCMS")
    })

    it("does not double-append", () => {
        expect(managedCollectionSyncName("Blog · KnotCMS")).toBe("Blog · KnotCMS")
    })
})

describe("userCollectionSyncName", () => {
    it("uses the plain source title", () => {
        expect(userCollectionSyncName("Blog")).toBe("Blog")
    })

    it("strips a legacy KnotCMS suffix", () => {
        expect(userCollectionSyncName("Blog · KnotCMS")).toBe("Blog")
    })

    it("falls back when title is empty", () => {
        expect(userCollectionSyncName(null)).toBe("Notion Sync")
        expect(userCollectionSyncName("   ")).toBe("Notion Sync")
    })
})
