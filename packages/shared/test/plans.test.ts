import { describe, expect, it } from "vitest"
import { getPlan, listCheckoutPlans, syncRemaining } from "../src/plans.js"

describe("plans", () => {
    it("defaults unknown plan ids to basic", () => {
        expect(getPlan("invalid").id).toBe("basic")
        expect(getPlan(null).syncQuota).toBe(3)
    })

    it("lists checkout plans as pro and max", () => {
        expect(listCheckoutPlans().map(p => p.id)).toEqual(["pro", "max"])
    })

    it("computes sync remaining for basic", () => {
        const basic = getPlan("basic")
        expect(syncRemaining(basic, 0)).toBe(3)
        expect(syncRemaining(basic, 2)).toBe(1)
        expect(syncRemaining(basic, 3)).toBe(0)
        expect(syncRemaining(getPlan("pro"), 99)).toBeNull()
    })
})
