import * as polarWebhooks from "@polar-sh/sdk/webhooks"
import { applyD1Migrations, env, reset } from "cloudflare:test"
import { afterEach, describe, expect, it, vi } from "vitest"
import { getCustomerByEmail } from "../../src/db/customers.js"
import { handleBillingWebhook } from "../../src/webhooks/billing.js"
import { signPolarWebhook } from "../helpers/polar-webhook.js"
import { testEnv } from "../helpers/test-env.js"

describe("handleBillingWebhook", () => {
    afterEach(async () => {
        vi.restoreAllMocks()
        await reset()
        await applyD1Migrations(env.DB, env.TEST_MIGRATIONS)
    })
    it("returns 503 when billing provider is not configured", async () => {
        const response = await handleBillingWebhook(
            testEnv({ BILLING_PROVIDER: undefined }),
            "{}",
            new Headers()
        )

        expect(response.status).toBe(503)
        expect(await response.text()).toBe("Billing provider not configured")
    })

    it("returns 503 when webhook secret is missing", async () => {
        const response = await handleBillingWebhook(
            testEnv({ BILLING_WEBHOOK_SECRET: undefined }),
            "{}",
            new Headers()
        )

        expect(response.status).toBe(503)
        expect(await response.text()).toBe("Billing webhook secret not configured")
    })

    it("returns 403 for an invalid signature", async () => {
        const body = "{}"
        const response = await handleBillingWebhook(
            testEnv({ BILLING_WEBHOOK_SECRET: "wrong-secret" }),
            body,
            signPolarWebhook(body)
        )

        expect(response.status).toBe(403)
        expect(await response.text()).toBe("Invalid signature")
    })

    it("returns 202 when signature verifies and handler succeeds", async () => {
        vi.spyOn(polarWebhooks, "validateEvent").mockReturnValue({
            type: "checkout.updated",
            data: {},
        } as never)

        const response = await handleBillingWebhook(testEnv(), "{}", new Headers())
        expect(response.status).toBe(202)
    })

    it("persists cancel-at-period-end from a verified subscription.canceled event", async () => {
        vi.spyOn(polarWebhooks, "validateEvent").mockReturnValue({
            type: "subscription.canceled",
            data: {
                id: "sub_webhook_cancel",
                status: "active",
                cancel_at_period_end: true,
                current_period_end: "2026-06-15T00:00:00.000Z",
                customerId: "cus_webhook_cancel",
                customer: { email: "webhook-cancel@example.com" },
            },
        } as never)

        const response = await handleBillingWebhook(testEnv(), "{}", new Headers())
        expect(response.status).toBe(202)

        const customer = await getCustomerByEmail(testEnv(), "webhook-cancel@example.com")
        expect(customer?.subscription_cancel_at_period_end).toBe(1)
        expect(customer?.subscription_ends_at).toContain("2026-06-15")
    })
})
