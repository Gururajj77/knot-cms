import { applyD1Migrations, reset } from "cloudflare:test"
import { env } from "cloudflare:workers"
import { afterEach, describe, expect, it } from "vitest"
import { applyNormalizedSubscriptionEvent } from "../../src/billing/apply-event.js"
import { resolveSubscriptionProjectLimit } from "../../src/billing/subscription-limit.js"
import { getCustomerByEmail } from "../../src/db/customers.js"
import { testEnv } from "../helpers/test-env.js"

describe("resolveSubscriptionProjectLimit", () => {
    it("returns undefined when not entitled", () => {
        expect(resolveSubscriptionProjectLimit(5, false, null)).toBeUndefined()
    })

    it("uses explicit seat count when entitled", () => {
        expect(resolveSubscriptionProjectLimit(10, true, null)).toBe(10)
    })

    it("defaults to 1 for new paid customers without seats", () => {
        expect(resolveSubscriptionProjectLimit(null, true, null)).toBe(1)
    })

    it("preserves existing limit when seats are omitted", () => {
        expect(resolveSubscriptionProjectLimit(null, true, 5)).toBeUndefined()
    })
})

describe("applyNormalizedSubscriptionEvent", () => {
    afterEach(async () => {
        await reset()
        await applyD1Migrations(env.DB, env.TEST_MIGRATIONS)
    })

    it("upserts paid customer with seat limit from quantity", async () => {
        await applyNormalizedSubscriptionEvent(testEnv(), {
            email: "dodo@example.com",
            billingProvider: "dodo",
            externalCustomerId: "cus_dodo_1",
            externalSubscriptionId: "sub_dodo_1",
            subscriptionStatus: "active",
            planId: "paid",
            quantity: 7,
            cancelAtPeriodEnd: false,
            subscriptionEndsAt: null,
        })

        const customer = await getCustomerByEmail(testEnv(), "dodo@example.com")
        expect(customer).toMatchObject({
            billing_provider: "dodo",
            external_customer_id: "cus_dodo_1",
            external_subscription_id: "sub_dodo_1",
            subscription_status: "active",
            plan_id: "paid",
            subscription_project_limit: 7,
        })
    })

    it("clears cancel schedule on inactive subscription", async () => {
        await applyNormalizedSubscriptionEvent(testEnv(), {
            email: "inactive@example.com",
            billingProvider: "dodo",
            externalCustomerId: "cus_inactive",
            externalSubscriptionId: "sub_inactive",
            subscriptionStatus: "active",
            planId: "paid",
            quantity: 2,
            cancelAtPeriodEnd: true,
            subscriptionEndsAt: "2026-12-01T00:00:00.000Z",
        })

        await applyNormalizedSubscriptionEvent(testEnv(), {
            email: "inactive@example.com",
            billingProvider: "dodo",
            externalCustomerId: "cus_inactive",
            externalSubscriptionId: "sub_inactive",
            subscriptionStatus: "inactive",
            quantity: null,
            cancelAtPeriodEnd: false,
            subscriptionEndsAt: null,
        })

        const customer = await getCustomerByEmail(testEnv(), "inactive@example.com")
        expect(customer?.subscription_status).toBe("inactive")
        expect(customer?.subscription_cancel_at_period_end).toBe(0)
        expect(customer?.subscription_ends_at).toBeNull()
    })
})
