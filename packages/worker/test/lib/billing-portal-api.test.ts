import { describe, expect, it } from "vitest"
import {
    canUseDodoPortalApi,
    createBillingPortalSession,
    usesBillingPortalApi,
} from "../../src/lib/billing-portal-api.js"
import { dodoTestEnv, testEnv } from "../helpers/test-env.js"

describe("canUseDodoPortalApi", () => {
    it("is true for dodo with API key", () => {
        expect(canUseDodoPortalApi(dodoTestEnv())).toBe(true)
    })

    it("is false for polar", () => {
        expect(canUseDodoPortalApi(testEnv())).toBe(false)
    })
})

describe("usesBillingPortalApi", () => {
    it("mirrors dodo portal api readiness", () => {
        expect(usesBillingPortalApi(dodoTestEnv())).toBe(true)
        expect(usesBillingPortalApi(testEnv())).toBe(false)
    })
})

describe("createBillingPortalSession", () => {
    it("returns polar static portal url", async () => {
        const result = await createBillingPortalSession(
            testEnv({ BILLING_CUSTOMER_PORTAL_URL: "https://polar.example/portal" }),
            { externalCustomerId: null, returnUrl: "http://localhost/profile" }
        )
        expect(result.url).toBe("https://polar.example/portal")
    })
})
