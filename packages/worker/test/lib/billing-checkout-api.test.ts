import { describe, expect, it } from "vitest"
import {
    canUseDodoCheckoutApi,
    createBillingCheckout,
    parseCheckoutQuantity,
    usesBillingCheckoutApi,
} from "../../src/lib/billing-checkout-api.js"
import { resolveDodoApiBaseUrl } from "../../src/lib/dodo-checkout.js"
import { dodoTestEnv, testEnv } from "../helpers/test-env.js"

describe("parseCheckoutQuantity", () => {
    it("accepts integers in range", () => {
        expect(parseCheckoutQuantity(3)).toBe(3)
        expect(parseCheckoutQuantity("10")).toBe(10)
    })

    it("rejects out of range values", () => {
        expect(parseCheckoutQuantity(0)).toBeNull()
        expect(parseCheckoutQuantity(101)).toBeNull()
        expect(parseCheckoutQuantity("abc")).toBeNull()
    })
})

describe("canUseDodoCheckoutApi", () => {
    it("is true when dodo secrets are set", () => {
        expect(canUseDodoCheckoutApi(dodoTestEnv())).toBe(true)
    })

    it("is false for polar", () => {
        expect(canUseDodoCheckoutApi(testEnv())).toBe(false)
    })
})

describe("usesBillingCheckoutApi", () => {
    it("mirrors dodo api readiness", () => {
        expect(usesBillingCheckoutApi(dodoTestEnv())).toBe(true)
        expect(usesBillingCheckoutApi(testEnv())).toBe(false)
    })
})

describe("resolveDodoApiBaseUrl", () => {
    it("defaults to test host", () => {
        expect(resolveDodoApiBaseUrl(dodoTestEnv())).toBe("https://test.dodopayments.com")
    })

    it("uses live host when configured", () => {
        expect(
            resolveDodoApiBaseUrl(dodoTestEnv({ DODO_PAYMENTS_ENVIRONMENT: "live" }))
        ).toBe("https://live.dodopayments.com")
    })
})

describe("createBillingCheckout", () => {
    it("returns polar static checkout url", async () => {
        const result = await createBillingCheckout(
            testEnv({ BILLING_CHECKOUT_URL_PAID: "https://polar.example/checkout" }),
            {
                email: "polar@example.com",
                customerId: "cus_polar",
                quantity: 5,
                returnUrl: "http://localhost/profile/plans",
            }
        )
        expect(result.url).toBe("https://polar.example/checkout")
    })
})
