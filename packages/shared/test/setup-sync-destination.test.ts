import { describe, expect, it } from "vitest"
import {
    canChooseFramerSyncDestination,
    resolveEffectiveSyncDestination,
    syncDestinationForSetupPath,
} from "../src/setup-sync-destination.js"
import { buildFramerSyncTarget } from "../src/framer-sync-target.js"
import { PENDING_FRAMER_COLLECTION_ID } from "../src/types.js"

const userCollection = { managedBy: "user" as const }
const pluginCollection = { managedBy: "thisPlugin" as const }
const otherPluginCollection = { managedBy: "anotherPlugin" as const }

describe("canChooseFramerSyncDestination", () => {
    it("returns false for notion_to_framer even when a collection is selected", () => {
        expect(canChooseFramerSyncDestination("notion_to_framer", pluginCollection)).toBe(false)
    })

    it("returns false without a collection", () => {
        expect(canChooseFramerSyncDestination("connect_existing", null)).toBe(false)
        expect(canChooseFramerSyncDestination(null, null)).toBe(false)
    })

    it("returns false for another plugin collection", () => {
        expect(canChooseFramerSyncDestination("connect_existing", otherPluginCollection)).toBe(false)
    })

    it("returns true for connect_existing and framer_to_notion with user or thisPlugin collections", () => {
        expect(canChooseFramerSyncDestination("connect_existing", userCollection)).toBe(true)
        expect(canChooseFramerSyncDestination("connect_existing", pluginCollection)).toBe(true)
        expect(canChooseFramerSyncDestination("framer_to_notion", pluginCollection)).toBe(true)
    })

    it("returns true when path is null but a collection exists (pre-path step 2)", () => {
        expect(canChooseFramerSyncDestination(null, pluginCollection)).toBe(true)
    })
})

describe("resolveEffectiveSyncDestination", () => {
    it("always uses new_managed for notion_to_framer", () => {
        expect(
            resolveEffectiveSyncDestination("notion_to_framer", "in_place", pluginCollection)
        ).toBe("new_managed")
    })

    it("respects user choice when the chooser is available", () => {
        expect(
            resolveEffectiveSyncDestination("connect_existing", "in_place", pluginCollection)
        ).toBe("in_place")
        expect(
            resolveEffectiveSyncDestination("connect_existing", "new_managed", pluginCollection)
        ).toBe("new_managed")
    })

    it("falls back to new_managed when the chooser is unavailable", () => {
        expect(resolveEffectiveSyncDestination("connect_existing", "in_place", null)).toBe(
            "new_managed"
        )
        expect(
            resolveEffectiveSyncDestination("framer_to_notion", "in_place", otherPluginCollection)
        ).toBe("new_managed")
    })
})

describe("syncDestinationForSetupPath", () => {
    it("defaults notion_to_framer to new_managed and other paths to in_place", () => {
        expect(syncDestinationForSetupPath("notion_to_framer")).toBe("new_managed")
        expect(syncDestinationForSetupPath("connect_existing")).toBe("in_place")
        expect(syncDestinationForSetupPath("framer_to_notion")).toBe("in_place")
    })
})

describe("notion_to_framer end-to-end sync target", () => {
    it("creates a pending user collection when option 3 is chosen", () => {
        const path = "notion_to_framer" as const
        const canChoose = canChooseFramerSyncDestination(path, pluginCollection)
        const destination = resolveEffectiveSyncDestination(path, "new_managed", pluginCollection)

        expect(canChoose).toBe(false)
        expect(destination).toBe("new_managed")

        const target = buildFramerSyncTarget(
            { id: "col_1", name: "Blog", managedBy: "thisPlugin" },
            "Notion DB",
            { destination }
        )

        expect(target.syncMode).toBe("user")
        expect(target.syncCollectionId).toBe(PENDING_FRAMER_COLLECTION_ID)
        expect(target.syncCollectionName).toBe("Notion DB")
    })
})
