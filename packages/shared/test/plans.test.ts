import { describe, expect, it } from "vitest"
import { BOOTSTRAP_IMPORT_ROW_MAX } from "../src/framer-to-notion-import.js"
import {
    BASIC_TIER_ROW_MAX,
    effectiveProjectLimit,
    effectiveRateLimit,
    getPlan,
    importRowMaxForPlan,
    listCheckoutPlans,
    normalizePlanId,
    syncRemaining,
    syncRowMaxForPlan,
} from "../src/plans.js"

describe("plans", () => {
    it("defaults unknown plan ids to basic", () => {
        expect(getPlan("invalid").id).toBe("basic")
        expect(getPlan(null).syncQuota).toBe(3)
    })

    it("normalizes legacy pro and max to paid", () => {
        expect(normalizePlanId("pro")).toBe("paid")
        expect(normalizePlanId("max")).toBe("paid")
    })

    it("lists checkout plan as paid only", () => {
        expect(listCheckoutPlans().map(p => p.id)).toEqual(["paid"])
    })

    it("computes sync remaining for basic", () => {
        const basic = getPlan("basic")
        expect(syncRemaining(basic, 0)).toBe(3)
        expect(syncRemaining(basic, 2)).toBe(1)
        expect(syncRemaining(basic, 3)).toBe(0)
        expect(syncRemaining(getPlan("paid"), 99)).toBeNull()
    })

    it("uses Polar seat count for paid project limit", () => {
        expect(
            effectiveProjectLimit({ plan_id: "paid", subscription_project_limit: 10 })
        ).toBe(10)
        expect(effectiveProjectLimit({ plan_id: "paid", subscription_project_limit: null })).toBe(1)
        expect(effectiveProjectLimit({ plan_id: "basic", subscription_project_limit: 99 })).toBe(1)
    })

    it("scales paid rate limits with seat count", () => {
        const basic = effectiveRateLimit({ plan_id: "basic" }, "createProject")
        expect(basic.max).toBe(2)

        const paidFive = effectiveRateLimit(
            { plan_id: "paid", subscription_project_limit: 5 },
            "createProject"
        )
        expect(paidFive.max).toBe(14)

        const paidMany = effectiveRateLimit(
            { plan_id: "paid", subscription_project_limit: 100 },
            "manualSync"
        )
        expect(paidMany.max).toBe(45)
    })

    it("caps row imports and syncs on basic", () => {
        expect(importRowMaxForPlan("basic")).toBe(BASIC_TIER_ROW_MAX)
        expect(importRowMaxForPlan("paid")).toBe(BOOTSTRAP_IMPORT_ROW_MAX)
        expect(syncRowMaxForPlan("basic")).toBe(BASIC_TIER_ROW_MAX)
        expect(syncRowMaxForPlan("paid")).toBeNull()
    })

    it("normalizes legacy tiers for rate limits", () => {
        const fromPro = effectiveRateLimit(
            { plan_id: "pro", subscription_project_limit: 3 },
            "setupSession"
        )
        expect(fromPro.max).toBe(21)

        const scaled = effectiveRateLimit(
            { plan_id: "paid", subscription_project_limit: 20 },
            "setupSession"
        )
        expect(scaled.max).toBe(40)
    })
})
