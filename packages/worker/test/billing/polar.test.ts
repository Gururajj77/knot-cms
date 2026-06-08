import { applyD1Migrations, reset } from "cloudflare:test"
import { env } from "cloudflare:workers"
import { afterEach, describe, expect, it } from "vitest"
import { handlePolarBillingEvent, mapPolarSubscriptionStatus } from "../../src/billing/polar.js"
import { getCustomerByEmail, isCustomerEntitled } from "../../src/db/customers.js"
import { testEnv } from "../helpers/test-env.js"

describe("mapPolarSubscriptionStatus", () => {
    it("maps active and trialing to entitled", () => {
        expect(mapPolarSubscriptionStatus("active")).toBe("active")
        expect(mapPolarSubscriptionStatus("trialing")).toBe("active")
    })

    it("maps other statuses to inactive", () => {
        expect(mapPolarSubscriptionStatus("canceled")).toBe("inactive")
        expect(mapPolarSubscriptionStatus("past_due")).toBe("inactive")
        expect(mapPolarSubscriptionStatus("revoked")).toBe("inactive")
    })
})

describe("handlePolarBillingEvent", () => {
    afterEach(async () => {
        await reset()
        await applyD1Migrations(env.DB, env.TEST_MIGRATIONS)
    })

    it("upserts an active customer from customer.state_changed", async () => {
        await handlePolarBillingEvent(testEnv(), {
            type: "customer.state_changed",
            data: {
                id: "cus_test_1",
                email: "subscriber@example.com",
                activeSubscriptions: [{ id: "sub_test_1", status: "active" }],
            },
        })

        const customer = await getCustomerByEmail(testEnv(), "subscriber@example.com")
        expect(customer).toMatchObject({
            email: "subscriber@example.com",
            billing_provider: "polar",
            external_customer_id: "cus_test_1",
            external_subscription_id: "sub_test_1",
            subscription_status: "active",
        })
        expect(isCustomerEntitled(customer)).toBe(true)
    })

    it("marks customer inactive when no active subscriptions remain", async () => {
        await handlePolarBillingEvent(testEnv(), {
            type: "customer.state_changed",
            data: {
                id: "cus_test_2",
                email: "lapsed@example.com",
                activeSubscriptions: [],
            },
        })

        const customer = await getCustomerByEmail(testEnv(), "lapsed@example.com")
        expect(customer?.subscription_status).toBe("inactive")
        expect(isCustomerEntitled(customer)).toBe(false)
    })

    it("updates subscription from subscription.active payload", async () => {
        await handlePolarBillingEvent(testEnv(), {
            type: "subscription.active",
            data: {
                id: "sub_test_3",
                status: "active",
                customerId: "cus_test_3",
                customer: { email: "active@example.com" },
            },
        })

        const customer = await getCustomerByEmail(testEnv(), "active@example.com")
        expect(customer).toMatchObject({
            external_customer_id: "cus_test_3",
            external_subscription_id: "sub_test_3",
            subscription_status: "active",
        })
    })

    it("revokes access on subscription.revoked", async () => {
        await handlePolarBillingEvent(testEnv(), {
            type: "subscription.active",
            data: {
                id: "sub_test_4",
                status: "active",
                customerId: "cus_test_4",
                customer: { email: "revoke@example.com" },
            },
        })

        await handlePolarBillingEvent(testEnv(), {
            type: "subscription.revoked",
            data: {
                id: "sub_test_4",
                status: "canceled",
                customerId: "cus_test_4",
                customer: { email: "revoke@example.com" },
            },
        })

        const customer = await getCustomerByEmail(testEnv(), "revoke@example.com")
        expect(customer?.subscription_status).toBe("inactive")
    })

    it("ignores events without an email", async () => {
        await handlePolarBillingEvent(testEnv(), {
            type: "customer.state_changed",
            data: {
                id: "cus_no_email",
                email: null,
                activeSubscriptions: [],
            },
        })

        const row = await env.DB.prepare(`SELECT COUNT(*) AS count FROM customers`).first<{ count: number }>()
        expect(row?.count).toBe(0)
    })
})
