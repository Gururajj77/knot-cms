import { describe, expect, it } from "vitest"
import { shouldPreserveUnlinkedFramerRows } from "../src/framer-bootstrap-sync.js"

describe("shouldPreserveUnlinkedFramerRows", () => {
    it("returns true for partial framer_to_notion in-place bootstrap", () => {
        expect(
            shouldPreserveUnlinkedFramerRows({
                setupPath: "framer_to_notion",
                syncDestination: "in_place",
                importRowCount: 3,
                framerRowTotal: 10,
            })
        ).toBe(true)
    })

    it("returns true when no rows are imported on framer_to_notion in-place", () => {
        expect(
            shouldPreserveUnlinkedFramerRows({
                setupPath: "framer_to_notion",
                syncDestination: "in_place",
                importRowCount: 0,
                framerRowTotal: 10,
            })
        ).toBe(true)
    })

    it("returns false when all Framer rows are imported", () => {
        expect(
            shouldPreserveUnlinkedFramerRows({
                setupPath: "framer_to_notion",
                syncDestination: "in_place",
                importRowCount: 10,
                framerRowTotal: 10,
            })
        ).toBe(false)
    })

    it("returns false for notion_to_framer or new managed collection", () => {
        expect(
            shouldPreserveUnlinkedFramerRows({
                setupPath: "notion_to_framer",
                syncDestination: "in_place",
                importRowCount: 1,
                framerRowTotal: 10,
            })
        ).toBe(false)

        expect(
            shouldPreserveUnlinkedFramerRows({
                setupPath: "framer_to_notion",
                syncDestination: "new_managed",
                importRowCount: 1,
                framerRowTotal: 10,
            })
        ).toBe(false)
    })
})
