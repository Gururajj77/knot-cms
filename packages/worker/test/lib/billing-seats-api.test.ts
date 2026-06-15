import { describe, expect, it } from "vitest"
import {
    canUseDodoSeatsApi,
    toUserFacingSeatChangeError,
    usesBillingSeatsApi,
} from "../../src/lib/billing-seats-api.js"
import { dodoTestEnv, testEnv } from "../helpers/test-env.js"

describe("canUseDodoSeatsApi", () => {
    it("is true for dodo with checkout api configured", () => {
        expect(canUseDodoSeatsApi(dodoTestEnv())).toBe(true)
    })

    it("is false for polar", () => {
        expect(canUseDodoSeatsApi(testEnv())).toBe(false)
    })
})

describe("usesBillingSeatsApi", () => {
    it("mirrors dodo seats api readiness", () => {
        expect(usesBillingSeatsApi(dodoTestEnv())).toBe(true)
        expect(usesBillingSeatsApi(testEnv())).toBe(false)
    })
})

describe("toUserFacingSeatChangeError", () => {
    it("hides raw Dodo API errors", () => {
        expect(
            toUserFacingSeatChangeError(
                "Only full_immediately proration mode is allowed with effective_at: next_billing_date"
            )
        ).toBe("We couldn't update your subscription right now. Please try again in a few minutes.")
    })

    it("explains stuck pending plan changes clearly", () => {
        expect(toUserFacingSeatChangeError("PENDING_PLAN_CHANGE_PAYMENT")).toContain(
            "earlier attempt"
        )
    })

    it("keeps validation errors readable", () => {
        expect(toUserFacingSeatChangeError("No subscription linked yet. Complete checkout first.")).toBe(
            "No subscription linked yet. Complete checkout first."
        )
    })
})
