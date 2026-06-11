import { describe, expect, it } from "vitest"
import { managedCollectionSyncName } from "../src/framer-sync-name.js"

describe("managedCollectionSyncName", () => {
    it("appends KnotCMS suffix", () => {
        expect(managedCollectionSyncName("Blog")).toBe("Blog · KnotCMS")
    })

    it("does not double-append", () => {
        expect(managedCollectionSyncName("Blog · KnotCMS")).toBe("Blog · KnotCMS")
    })
})
