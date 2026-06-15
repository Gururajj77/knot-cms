import { applyD1Migrations, reset } from "cloudflare:test"
import { env } from "cloudflare:workers"
import { afterEach, describe, expect, it } from "vitest"
import {
    dodoSubscriptionToNormalizedEvent,
    handleDodoBillingEvent,
    parseDodoSubscriptionQuantity,
    parseDodoSubscriptionSchedule,
    resolveDodoSubscriptionEntitlement,
} from "../../src/billing/dodo.js"
import { getCustomerByEmail, isCustomerEntitled } from "../../src/db/customers.js"
import { dodoWebhookEvent, signDodoWebhook, dodoSubscriptionData } from "../helpers/dodo-webhook.js"
import { dodoTestEnv } from "../helpers/test-env.js"

describe("parseDodoSubscriptionQuantity", () => {
    it("parses quantity from subscription payload", () => {
        expect(parseDodoSubscriptionQuantity({ quantity: 10 })).toBe(10)
        expect(parseDodoSubscriptionQuantity({ quantity: 0 })).toBeNull()
    })
})

describe("parseDodoSubscriptionSchedule", () => {
    it("parses cancel-at-period-end from next billing date", () => {
        expect(
            parseDodoSubscriptionSchedule({
                cancel_at_next_billing_date: true,
                next_billing_date: "2026-06-15T00:00:00.000Z",
            })
        ).toEqual({
            cancelAtPeriodEnd: true,
            subscriptionEndsAt: "2026-06-15T00:00:00.000Z",
        })
    })
})

describe("resolveDodoSubscriptionEntitlement", () => {
    it("keeps access during cancel-at-period-end", () => {
        expect(
            resolveDodoSubscriptionEntitlement("subscription.cancelled", "cancelled", {
                cancelAtPeriodEnd: true,
                subscriptionEndsAt: "2099-01-01T00:00:00.000Z",
            })
        ).toEqual({ subscriptionStatus: "active", entitled: true })
    })

    it("revokes access for expired events", () => {
        expect(
            resolveDodoSubscriptionEntitlement("subscription.expired", "expired", {
                cancelAtPeriodEnd: false,
                subscriptionEndsAt: null,
            })
        ).toEqual({ subscriptionStatus: "inactive", entitled: false })
    })
})

describe("handleDodoBillingEvent", () => {
    afterEach(async () => {
        await reset()
        await applyD1Migrations(env.DB, env.TEST_MIGRATIONS)
    })

    it("upserts active subscription with seat limit from quantity", async () => {
        const event = dodoWebhookEvent("subscription.active", {
            subscription_id: "sub_seats_10",
            quantity: 10,
            customer: {
                customer_id: "cus_seats_10",
                email: "seats@example.com",
                name: "Seats User",
            },
        })

        await handleDodoBillingEvent(dodoTestEnv(), event)

        const customer = await getCustomerByEmail(dodoTestEnv(), "seats@example.com")
        expect(customer).toMatchObject({
            billing_provider: "dodo",
            external_customer_id: "cus_seats_10",
            external_subscription_id: "sub_seats_10",
            subscription_status: "active",
            plan_id: "paid",
            subscription_project_limit: 10,
        })
        expect(isCustomerEntitled(customer)).toBe(true)
    })

    it("updates seat limit on subscription.updated", async () => {
        const env = dodoTestEnv()
        await handleDodoBillingEvent(
            env,
            dodoWebhookEvent("subscription.active", {
                subscription_id: "sub_qty_change",
                quantity: 10,
                customer: {
                    customer_id: "cus_qty_change",
                    email: "qty-change@example.com",
                    name: "Qty Change",
                },
            })
        )

        await handleDodoBillingEvent(
            env,
            dodoWebhookEvent("subscription.updated", {
                subscription_id: "sub_qty_change",
                quantity: 5,
                customer: {
                    customer_id: "cus_qty_change",
                    email: "qty-change@example.com",
                    name: "Qty Change",
                },
            })
        )

        const customer = await getCustomerByEmail(env, "qty-change@example.com")
        expect(customer?.subscription_project_limit).toBe(5)
    })

    it("ignores wrong product id", async () => {
        await handleDodoBillingEvent(
            dodoTestEnv(),
            dodoWebhookEvent("subscription.active", {
                product_id: "prod_other",
                customer: {
                    customer_id: "cus_wrong",
                    email: "wrong-product@example.com",
                    name: "Wrong",
                },
            })
        )

        const customer = await getCustomerByEmail(dodoTestEnv(), "wrong-product@example.com")
        expect(customer).toBeNull()
    })

    it("marks customer inactive on subscription.expired", async () => {
        const env = dodoTestEnv()
        await handleDodoBillingEvent(
            env,
            dodoWebhookEvent("subscription.active", {
                subscription_id: "sub_expire",
                quantity: 2,
                customer: {
                    customer_id: "cus_expire",
                    email: "expire@example.com",
                    name: "Expire",
                },
            })
        )

        await handleDodoBillingEvent(
            env,
            dodoWebhookEvent("subscription.expired", {
                subscription_id: "sub_expire",
                quantity: 2,
                status: "expired",
                customer: {
                    customer_id: "cus_expire",
                    email: "expire@example.com",
                    name: "Expire",
                },
            })
        )

        const customer = await getCustomerByEmail(env, "expire@example.com")
        expect(customer?.subscription_status).toBe("inactive")
        expect(isCustomerEntitled(customer)).toBe(false)
    })

    it("stores cancel schedule from subscription.cancelled", async () => {
        const env = dodoTestEnv()
        const periodEnd = "2099-06-15T00:00:00.000Z"
        await handleDodoBillingEvent(
            env,
            dodoWebhookEvent("subscription.cancelled", {
                subscription_id: "sub_cancel",
                quantity: 3,
                status: "cancelled",
                cancel_at_next_billing_date: true,
                next_billing_date: periodEnd,
                customer: {
                    customer_id: "cus_cancel",
                    email: "cancel@example.com",
                    name: "Cancel",
                },
            })
        )

        const customer = await getCustomerByEmail(env, "cancel@example.com")
        expect(customer?.subscription_status).toBe("active")
        expect(customer?.subscription_cancel_at_period_end).toBe(1)
        expect(customer?.subscription_ends_at).toBe(periodEnd)
        expect(isCustomerEntitled(customer)).toBe(true)
    })

    it("preserves seat limit when quantity is omitted on subscription.updated", async () => {
        const env = dodoTestEnv()
        await handleDodoBillingEvent(
            env,
            dodoWebhookEvent("subscription.active", {
                subscription_id: "sub_preserve",
                quantity: 7,
                customer: {
                    customer_id: "cus_preserve",
                    email: "preserve@example.com",
                    name: "Preserve",
                },
            })
        )

        const normalized = dodoSubscriptionToNormalizedEvent(
            env,
            "subscription.updated",
            (() => {
                const data = dodoSubscriptionData({
                    subscription_id: "sub_preserve",
                    customer: {
                        customer_id: "cus_preserve",
                        email: "preserve@example.com",
                        name: "Preserve",
                    },
                })
                delete data.quantity
                return data
            })()
        )
        expect(normalized?.quantity).toBeNull()

        const updateEvent = dodoWebhookEvent("subscription.updated", {
            subscription_id: "sub_preserve",
            customer: {
                customer_id: "cus_preserve",
                email: "preserve@example.com",
                name: "Preserve",
            },
        })
        delete updateEvent.data.quantity

        await handleDodoBillingEvent(env, updateEvent)

        const customer = await getCustomerByEmail(env, "preserve@example.com")
        expect(customer?.subscription_project_limit).toBe(7)
    })
})
