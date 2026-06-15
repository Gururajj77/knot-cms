import { describe, expect, it } from "vitest"
import {
    getBillingConfigStatus,
    getBillingWebhookConfigError,
    listDodoBillingSecrets,
    listPolarBillingSecrets,
    resolveBillingProvider,
} from "../../src/lib/billing-config.js"
import { dodoTestEnv, testEnv } from "../helpers/test-env.js"

describe("resolveBillingProvider", () => {
    it("returns polar when explicitly set", () => {
        expect(resolveBillingProvider(testEnv({ BILLING_PROVIDER: "polar" }))).toBe("polar")
    })

    it("returns dodo when explicitly set", () => {
        expect(resolveBillingProvider(testEnv({ BILLING_PROVIDER: "dodo" }))).toBe("dodo")
    })

    it("returns null when unset or unknown", () => {
        expect(resolveBillingProvider(testEnv({ BILLING_PROVIDER: undefined }))).toBeNull()
        expect(resolveBillingProvider(testEnv({ BILLING_PROVIDER: "stripe" }))).toBeNull()
    })
})

describe("getBillingWebhookConfigError", () => {
    it("requires explicit polar provider and webhook secret", () => {
        expect(getBillingWebhookConfigError(testEnv({ BILLING_PROVIDER: undefined }))).toBe(
            "Billing provider not configured"
        )
        expect(getBillingWebhookConfigError(testEnv({ BILLING_WEBHOOK_SECRET: undefined }))).toBe(
            "Billing webhook secret not configured"
        )
        expect(getBillingWebhookConfigError(testEnv())).toBeNull()
    })

    it("validates dodo secrets", () => {
        expect(
            getBillingWebhookConfigError(testEnv({ BILLING_PROVIDER: "dodo" }))
        ).toBe("Dodo webhook secret not configured")

        expect(
            getBillingWebhookConfigError(
                testEnv({ BILLING_PROVIDER: "dodo", DODO_WEBHOOK_SECRET: "whsec" })
            )
        ).toBe("Dodo project product not configured")

        expect(
            getBillingWebhookConfigError(
                dodoTestEnv()
            )
        ).toBeNull()
    })
})

describe("getBillingConfigStatus", () => {
    it("lists missing polar secrets", () => {
        const status = getBillingConfigStatus(
            testEnv({
                BILLING_CHECKOUT_URL_PAID: undefined,
                POLAR_PROJECT_PRODUCT_ID: undefined,
            })
        )
        expect(status.provider).toBe("polar")
        expect(status.missingSecrets).toContain("BILLING_CHECKOUT_URL_PAID")
        expect(status.missingSecrets).toContain("POLAR_PROJECT_PRODUCT_ID")
        expect(status.webhookReady).toBe(true)
    })

    it("lists missing dodo secrets and warnings", () => {
        const status = getBillingConfigStatus(testEnv({ BILLING_PROVIDER: "dodo" }))
        expect(status.provider).toBe("dodo")
        expect(status.missingSecrets).toEqual(
            expect.arrayContaining(["DODO_API_KEY", "DODO_WEBHOOK_SECRET", "DODO_PROJECT_PRODUCT_ID"])
        )
        expect(status.webhookError).toBe("Dodo webhook secret not configured")
        expect(status.warnings.some(w => w.includes("DODO_CHECKOUT_URL_PAID"))).toBe(true)
    })
})

describe("secret list helpers", () => {
    it("listPolarBillingSecrets omits webhook secret when set", () => {
        expect(listPolarBillingSecrets(testEnv())).not.toContain("BILLING_WEBHOOK_SECRET")
    })

    it("listDodoBillingSecrets returns all three required keys when unset", () => {
        expect(listDodoBillingSecrets(testEnv({ BILLING_PROVIDER: "dodo" }))).toHaveLength(3)
    })
})
