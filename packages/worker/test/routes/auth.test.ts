import { SELF, applyD1Migrations, env, reset } from "cloudflare:test"
import { afterEach, describe, expect, it, vi } from "vitest"
import { createTestCustomer } from "../helpers/db-fixtures.js"
import { sessionCookieHeader } from "../helpers/session.js"
import { testEnv } from "../helpers/test-env.js"
import * as billingCheckoutApi from "../../src/lib/billing-checkout-api.js"
import * as billingConfig from "../../src/lib/billing-config.js"

describe("GET /api/auth/me", () => {
    afterEach(async () => {
        vi.restoreAllMocks()
        await reset()
        await applyD1Migrations(env.DB, env.TEST_MIGRATIONS)
    })

    it("returns 401 when unauthenticated", async () => {
        const response = await SELF.fetch("http://localhost/api/auth/me")
        expect(response.status).toBe(401)
        expect(await response.json()).toEqual({ authenticated: false })
    })

    it("exposes subscription cancel schedule for entitled customers", async () => {
        const customer = await createTestCustomer(testEnv(), "me-cancel@example.com", {
            planId: "paid",
            subscriptionStatus: "active",
            cancelAtPeriodEnd: true,
            subscriptionEndsAt: "2026-06-15T00:00:00.000Z",
        })
        const cookie = await sessionCookieHeader(testEnv(), customer.email, customer.id)

        const response = await SELF.fetch("http://localhost/api/auth/me", {
            headers: { Cookie: cookie },
        })

        expect(response.status).toBe(200)
        const body = (await response.json()) as {
            entitled: boolean
            subscriptionCancelAtPeriodEnd: boolean
            subscriptionEndsAt: string
            subscriptionStatus: string
        }
        expect(body.entitled).toBe(true)
        expect(body.subscriptionStatus).toBe("active")
        expect(body.subscriptionCancelAtPeriodEnd).toBe(true)
        expect(body.subscriptionEndsAt).toBe("2026-06-15T00:00:00.000Z")
    })

    it("omits cancel schedule when subscription is active and not canceled", async () => {
        const customer = await createTestCustomer(testEnv(), "me-active@example.com", {
            planId: "paid",
        })
        const cookie = await sessionCookieHeader(testEnv(), customer.email, customer.id)

        const response = await SELF.fetch("http://localhost/api/auth/me", {
            headers: { Cookie: cookie },
        })

        expect(response.status).toBe(200)
        const body = (await response.json()) as {
            subscriptionCancelAtPeriodEnd: boolean
            subscriptionEndsAt: string | null
        }
        expect(body.subscriptionCancelAtPeriodEnd).toBe(false)
        expect(body.subscriptionEndsAt).toBeNull()
    })

    it("exposes checkoutUsesApi for dodo when API is configured", async () => {
        vi.spyOn(billingConfig, "resolveBillingProvider").mockReturnValue("dodo")
        vi.spyOn(billingCheckoutApi, "usesBillingCheckoutApi").mockReturnValue(true)

        const customer = await createTestCustomer(testEnv(), "dodo-api@example.com")
        const cookie = await sessionCookieHeader(testEnv(), customer.email, customer.id)

        const response = await SELF.fetch("http://localhost/api/auth/me", {
            headers: { Cookie: cookie },
        })

        expect(response.status).toBe(200)
        const body = (await response.json()) as {
            billingProvider: string
            checkoutUsesApi: boolean
        }
        expect(body.billingProvider).toBe("dodo")
        expect(body.checkoutUsesApi).toBe(true)
    })

    it("exposes canonical Notion webhook URL from WORKER_PUBLIC_URL", async () => {
        const customer = await createTestCustomer(testEnv(), "webhook-url@example.com")
        const cookie = await sessionCookieHeader(testEnv(), customer.email, customer.id)

        const response = await SELF.fetch("http://localhost/api/auth/me", {
            headers: { Cookie: cookie },
        })

        expect(response.status).toBe(200)
        const body = (await response.json()) as { notionWebhookUrl: string }
        expect(body.notionWebhookUrl).toMatch(/\/webhooks\/notion$/)
    })
})
