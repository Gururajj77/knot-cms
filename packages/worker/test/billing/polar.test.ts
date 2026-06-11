import { applyD1Migrations, reset } from "cloudflare:test"
import { env } from "cloudflare:workers"
import { afterEach, describe, expect, it } from "vitest"
import {
    handlePolarBillingEvent,
    mapPolarSubscriptionStatus,
    parsePolarSubscriptionSchedule,
} from "../../src/billing/polar.js"
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
                activeSubscriptions: [{ id: "sub_lapsed", status: "active" }],
            },
        })

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
        expect(customer?.plan_id).toBe("pro")
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

    it("stores cancel-at-period-end from subscription.canceled while keeping access", async () => {
        await handlePolarBillingEvent(testEnv(), {
            type: "subscription.active",
            data: {
                id: "sub_cancel",
                status: "active",
                customerId: "cus_cancel",
                customer: { email: "cancel@example.com" },
            },
        })

        await handlePolarBillingEvent(testEnv(), {
            type: "subscription.canceled",
            data: {
                id: "sub_cancel",
                status: "active",
                cancel_at_period_end: true,
                current_period_end: "2026-06-15T00:00:00.000Z",
                customerId: "cus_cancel",
                customer: { email: "cancel@example.com" },
            },
        })

        const customer = await getCustomerByEmail(testEnv(), "cancel@example.com")
        expect(customer?.subscription_status).toBe("active")
        expect(customer?.subscription_cancel_at_period_end).toBe(1)
        expect(customer?.subscription_ends_at).toContain("2026-06-15")
        expect(isCustomerEntitled(customer)).toBe(true)
    })

    it("clears cancel schedule on subscription.uncanceled", async () => {
        await handlePolarBillingEvent(testEnv(), {
            type: "subscription.canceled",
            data: {
                id: "sub_uncancel",
                status: "active",
                cancel_at_period_end: true,
                current_period_end: "2026-06-15T00:00:00.000Z",
                customerId: "cus_uncancel",
                customer: { email: "uncancel@example.com" },
            },
        })

        await handlePolarBillingEvent(testEnv(), {
            type: "subscription.uncanceled",
            data: {
                id: "sub_uncancel",
                status: "active",
                cancel_at_period_end: false,
                customerId: "cus_uncancel",
                customer: { email: "uncancel@example.com" },
            },
        })

        const customer = await getCustomerByEmail(testEnv(), "uncancel@example.com")
        expect(customer?.subscription_cancel_at_period_end).toBe(0)
        expect(customer?.subscription_ends_at).toBeNull()
        expect(isCustomerEntitled(customer)).toBe(true)
    })

    it("clears cancel schedule on subscription.revoked", async () => {
        await handlePolarBillingEvent(testEnv(), {
            type: "subscription.canceled",
            data: {
                id: "sub_revoke_cancel",
                status: "active",
                cancel_at_period_end: true,
                current_period_end: "2026-06-15T00:00:00.000Z",
                customerId: "cus_revoke_cancel",
                customer: { email: "revoke-cancel@example.com" },
            },
        })

        await handlePolarBillingEvent(testEnv(), {
            type: "subscription.revoked",
            data: {
                id: "sub_revoke_cancel",
                status: "canceled",
                cancel_at_period_end: false,
                customerId: "cus_revoke_cancel",
                customer: { email: "revoke-cancel@example.com" },
            },
        })

        const customer = await getCustomerByEmail(testEnv(), "revoke-cancel@example.com")
        expect(customer?.subscription_status).toBe("inactive")
        expect(customer?.subscription_cancel_at_period_end).toBe(0)
        expect(customer?.subscription_ends_at).toBeNull()
        expect(isCustomerEntitled(customer)).toBe(false)
    })

    it("parses snake_case cancel fields from webhook payloads", () => {
        expect(
            parsePolarSubscriptionSchedule({
                cancel_at_period_end: true,
                current_period_end: "2026-06-15T00:00:00.000Z",
            })
        ).toEqual({
            cancelAtPeriodEnd: true,
            subscriptionEndsAt: "2026-06-15T00:00:00.000Z",
        })
    })

    it("parses camelCase cancel fields and endsAt fallback", () => {
        expect(
            parsePolarSubscriptionSchedule({
                cancelAtPeriodEnd: true,
                endsAt: "2026-07-01T12:00:00.000Z",
            })
        ).toEqual({
            cancelAtPeriodEnd: true,
            subscriptionEndsAt: "2026-07-01T12:00:00.000Z",
        })
    })

    it("does not set an end date when cancel_at_period_end is false", () => {
        expect(
            parsePolarSubscriptionSchedule({
                cancel_at_period_end: false,
                current_period_end: "2026-06-15T00:00:00.000Z",
            })
        ).toEqual({
            cancelAtPeriodEnd: false,
            subscriptionEndsAt: null,
        })
    })

    it("stores cancel schedule from customer.state_changed", async () => {
        await handlePolarBillingEvent(testEnv(), {
            type: "customer.state_changed",
            data: {
                id: "cus_state_cancel",
                email: "state-cancel@example.com",
                activeSubscriptions: [
                    {
                        id: "sub_state_cancel",
                        status: "active",
                        cancel_at_period_end: true,
                        current_period_end: "2026-06-15T00:00:00.000Z",
                    },
                ],
            },
        })

        const customer = await getCustomerByEmail(testEnv(), "state-cancel@example.com")
        expect(customer?.subscription_cancel_at_period_end).toBe(1)
        expect(customer?.subscription_ends_at).toContain("2026-06-15")
        expect(isCustomerEntitled(customer)).toBe(true)
    })

    it("keeps access for canceled status with future cancel-at-period-end", async () => {
        await handlePolarBillingEvent(testEnv(), {
            type: "subscription.canceled",
            data: {
                id: "sub_status_cancel",
                status: "canceled",
                cancel_at_period_end: true,
                current_period_end: "2099-01-01T00:00:00.000Z",
                customerId: "cus_status_cancel",
                customer: { email: "status-cancel@example.com" },
            },
        })

        const customer = await getCustomerByEmail(testEnv(), "status-cancel@example.com")
        expect(customer?.subscription_status).toBe("active")
        expect(customer?.subscription_cancel_at_period_end).toBe(1)
        expect(isCustomerEntitled(customer)).toBe(true)
    })

    it("revokes access when cancel-at-period-end date has passed", async () => {
        await handlePolarBillingEvent(testEnv(), {
            type: "subscription.active",
            data: {
                id: "sub_past_end",
                status: "active",
                customerId: "cus_past_end",
                customer: { email: "past-end@example.com" },
            },
        })

        await handlePolarBillingEvent(testEnv(), {
            type: "subscription.canceled",
            data: {
                id: "sub_past_end",
                status: "canceled",
                cancel_at_period_end: true,
                current_period_end: "2020-01-01T00:00:00.000Z",
                customerId: "cus_past_end",
                customer: { email: "past-end@example.com" },
            },
        })

        const customer = await getCustomerByEmail(testEnv(), "past-end@example.com")
        expect(customer?.subscription_status).toBe("inactive")
        expect(customer?.subscription_cancel_at_period_end).toBe(0)
        expect(isCustomerEntitled(customer)).toBe(false)
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
