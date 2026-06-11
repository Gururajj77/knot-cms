import { describe, expect, it } from "vitest"
import { PENDING_FRAMER_COLLECTION_ID } from "../src/types.js"
import {
    buildFramerSyncTarget,
    isInPlaceFramerSyncMode,
    isPluginOwnedFramerCollection,
    resolveFramerSyncMode,
    resolveProjectFramerSyncMode,
} from "../src/framer-sync-target.js"

describe("resolveFramerSyncMode", () => {
    it("uses the user collection API for editor CMS", () => {
        expect(resolveFramerSyncMode("user")).toBe("user")
        expect(isPluginOwnedFramerCollection("user")).toBe(false)
    })

    it("uses the managed collection API in place for Server API CMS", () => {
        expect(resolveFramerSyncMode("thisPlugin")).toBe("managed_in_place")
        expect(isPluginOwnedFramerCollection("thisPlugin")).toBe(true)
    })

    it("creates a managed target for another plugin's CMS", () => {
        expect(resolveFramerSyncMode("anotherPlugin")).toBe("managed")
    })
})

describe("buildFramerSyncTarget", () => {
    it("reuses user collections for sync", () => {
        const target = buildFramerSyncTarget({
            id: "col_user",
            name: "Blog",
            managedBy: "user",
        })

        expect(target.syncMode).toBe("user")
        expect(target.syncCollectionId).toBe("col_user")
        expect(target.syncCollectionName).toBe("Blog")
    })

    it("targets the selected Server API collection without creating a new one", () => {
        const target = buildFramerSyncTarget({
            id: "col_plugin",
            name: "Plugin CMS",
            managedBy: "thisPlugin",
        })

        expect(target.syncMode).toBe("managed_in_place")
        expect(target.syncCollectionId).toBe("col_plugin")
        expect(target.syncCollectionName).toBe("Plugin CMS")
        expect(isInPlaceFramerSyncMode(target.syncMode)).toBe(true)
    })

    it("creates a managed target for another plugin's collection", () => {
        const target = buildFramerSyncTarget({
            id: "col_other",
            name: "Other CMS",
            managedBy: "anotherPlugin",
        })

        expect(target.syncMode).toBe("managed")
        expect(target.syncCollectionId).toBe(PENDING_FRAMER_COLLECTION_ID)
        expect(target.syncCollectionName).toBe("Other CMS · KnotCMS")
    })
})

describe("resolveProjectFramerSyncMode", () => {
    it("falls back to user mode when a real collection id is stored", () => {
        expect(
            resolveProjectFramerSyncMode({
                framer_collection_id: "col_user",
                framer_collection_name: "Blog",
            })
        ).toBe("user")
    })

    it("reads managed_in_place from the project row", () => {
        expect(
            resolveProjectFramerSyncMode({
                framer_sync_mode: "managed_in_place",
                framer_collection_id: "col_plugin",
                framer_collection_name: "Plugin CMS",
            })
        ).toBe("managed_in_place")
    })
})
