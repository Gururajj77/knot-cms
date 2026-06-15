import { SELF, applyD1Migrations, env, reset } from "cloudflare:test"
import { afterEach, describe, expect, it, vi } from "vitest"
import * as billingCheckoutApi from "../../src/lib/billing-checkout-api.js"
import { createTestCustomer } from "../helpers/db-fixtures.js"
import { sessionCookieHeader } from "../helpers/session.js"
import { testEnv } from "../helpers/test-env.js"

describe("POST /api/billing/checkout", () => {
    afterEach(async () => {
        vi.restoreAllMocks()
        await reset()
        await applyD1Migrations(env.DB, env.TEST_MIGRATIONS)
    })

    it("returns 401 when unauthenticated", async () => {
        const response = await SELF.fetch("http://localhost/api/billing/checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ quantity: 1 }),
        })
        expect(response.status).toBe(401)
    })

    it("returns 400 for invalid quantity", async () => {
        const customer = await createTestCustomer(testEnv(), "qty-invalid@example.com")
        const cookie = await sessionCookieHeader(testEnv(), customer.email, customer.id)

        const response = await SELF.fetch("http://localhost/api/billing/checkout", {
            method: "POST",
            headers: { Cookie: cookie, "Content-Type": "application/json" },
            body: JSON.stringify({ quantity: 0 }),
        })
        expect(response.status).toBe(400)
    })

    it("returns checkout url from billing checkout service", async () => {
        vi.spyOn(billingCheckoutApi, "createBillingCheckout").mockResolvedValue({
            url: "https://checkout.example/session/cks_test",
            sessionId: "cks_test",
        })

        const customer = await createTestCustomer(testEnv(), "checkout@example.com")
        const cookie = await sessionCookieHeader(testEnv(), customer.email, customer.id)

        const response = await SELF.fetch("http://localhost/api/billing/checkout", {
            method: "POST",
            headers: { Cookie: cookie, "Content-Type": "application/json" },
            body: JSON.stringify({ quantity: 3 }),
        })

        expect(response.status).toBe(200)
        const body = (await response.json()) as { url: string; sessionId: string }
        expect(body.url).toBe("https://checkout.example/session/cks_test")
        expect(body.sessionId).toBe("cks_test")
        expect(billingCheckoutApi.createBillingCheckout).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                email: "checkout@example.com",
                customerId: customer.id,
                quantity: 3,
            })
        )
    })
})

describe("GET /api/billing/portal", () => {
    afterEach(async () => {
        vi.restoreAllMocks()
        await reset()
        await applyD1Migrations(env.DB, env.TEST_MIGRATIONS)
    })

    it("returns 401 when unauthenticated", async () => {
        const response = await SELF.fetch("http://localhost/api/billing/portal")
        expect(response.status).toBe(401)
    })

    it("returns portal url from billing portal service", async () => {
        const portalApi = await import("../../src/lib/billing-portal-api.js")
        vi.spyOn(portalApi, "createBillingPortalSession").mockResolvedValue({
            url: "https://portal.example/session",
        })

        const customer = await createTestCustomer(testEnv(), "portal@example.com")
        const cookie = await sessionCookieHeader(testEnv(), customer.email, customer.id)

        const response = await SELF.fetch("http://localhost/api/billing/portal", {
            headers: { Cookie: cookie },
        })

        expect(response.status).toBe(200)
        const body = (await response.json()) as { url: string }
        expect(body.url).toBe("https://portal.example/session")
    })
})

describe("GET /api/billing/config", () => {
    it("returns public billing config", async () => {
        const response = await SELF.fetch("http://localhost/api/billing/config")
        expect(response.status).toBe(200)
        const body = (await response.json()) as {
            provider: string | null
            merchantLabel: string
            checkoutUsesApi: boolean
            portalUsesApi: boolean
            seatsUsesApi: boolean
        }
        expect(body).toHaveProperty("merchantLabel")
        expect(typeof body.checkoutUsesApi).toBe("boolean")
        expect(typeof body.portalUsesApi).toBe("boolean")
        expect(typeof body.seatsUsesApi).toBe("boolean")
    })
})

describe("POST /api/billing/restart-with-seats", () => {
    afterEach(async () => {
        vi.restoreAllMocks()
        await reset()
        await applyD1Migrations(env.DB, env.TEST_MIGRATIONS)
    })

    it("returns checkout url from restart billing service", async () => {
        const restartApi = await import("../../src/lib/billing-restart-api.js")
        vi.spyOn(restartApi, "restartBillingWithSeats").mockResolvedValue({
            url: "https://checkout.example/restart",
            sessionId: "cks_restart",
        })

        const customer = await createTestCustomer(testEnv(), "restart@example.com", {
            planId: "paid",
            subscriptionProjectLimit: 3,
            billingProvider: "dodo",
            externalSubscriptionId: "sub_restart",
        })
        const cookie = await sessionCookieHeader(testEnv(), customer.email, customer.id)

        const response = await SELF.fetch("http://localhost/api/billing/restart-with-seats", {
            method: "POST",
            headers: { Cookie: cookie, "Content-Type": "application/json" },
            body: JSON.stringify({ quantity: 2 }),
        })

        expect(response.status).toBe(200)
        const body = (await response.json()) as { url: string; message: string }
        expect(body.url).toBe("https://checkout.example/restart")
        expect(body.message).toContain("not refunded")
    })
})
