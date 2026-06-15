import { describe, expect, it } from "vitest"
import {
    resolveBillingCheckoutUrl,
    resolveBillingCustomerPortalUrl,
} from "../../src/lib/billing-checkout.js"
import { testEnv } from "../helpers/test-env.js"

describe("resolveBillingCheckoutUrl", () => {
    it("uses polar checkout urls by default", () => {
        expect(
            resolveBillingCheckoutUrl(
                testEnv({
                    BILLING_CHECKOUT_URL_PAID: "https://polar.example/checkout",
                })
            )
        ).toBe("https://polar.example/checkout")
    })

    it("uses dodo checkout url when provider is dodo", () => {
        expect(
            resolveBillingCheckoutUrl(
                testEnv({
                    BILLING_PROVIDER: "dodo",
                    DODO_CHECKOUT_URL_PAID: "https://dodo.example/checkout",
                    BILLING_CHECKOUT_URL_PAID: "https://polar.example/checkout",
                })
            )
        ).toBe("https://dodo.example/checkout")
    })
})

describe("resolveBillingCustomerPortalUrl", () => {
    it("uses polar portal by default", () => {
        expect(
            resolveBillingCustomerPortalUrl(
                testEnv({ BILLING_CUSTOMER_PORTAL_URL: "https://polar.example/portal" })
            )
        ).toBe("https://polar.example/portal")
    })

    it("uses dodo portal when provider is dodo", () => {
        expect(
            resolveBillingCustomerPortalUrl(
                testEnv({
                    BILLING_PROVIDER: "dodo",
                    DODO_CUSTOMER_PORTAL_URL: "https://dodo.example/portal",
                    BILLING_CUSTOMER_PORTAL_URL: "https://polar.example/portal",
                })
            )
        ).toBe("https://dodo.example/portal")
    })
})
