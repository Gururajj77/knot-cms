import * as polarWebhooks from "@polar-sh/sdk/webhooks"
import { afterEach, describe, expect, it, vi } from "vitest"
import { handleBillingWebhook } from "../../src/webhooks/billing.js"
import { signPolarWebhook } from "../helpers/polar-webhook.js"
import { testEnv } from "../helpers/test-env.js"

describe("handleBillingWebhook", () => {
    afterEach(() => {
        vi.restoreAllMocks()
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
})
