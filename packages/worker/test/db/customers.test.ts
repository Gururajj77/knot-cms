import { applyD1Migrations, env, reset } from "cloudflare:test"
import { afterEach, describe, expect, it } from "vitest"
import {
    getCustomerByEmail,
    isCustomerEntitled,
    setCustomerSubscriptionSchedule,
} from "../../src/db/customers.js"
import { createTestCustomer } from "../helpers/db-fixtures.js"
import { testEnv } from "../helpers/test-env.js"

describe("setCustomerSubscriptionSchedule", () => {
    afterEach(async () => {
        await reset()
        await applyD1Migrations(env.DB, env.TEST_MIGRATIONS)
    })

    it("stores cancel-at-period-end fields on an existing customer", async () => {
        const { email } = await createTestCustomer(testEnv(), "schedule@example.com", {
            planId: "pro",
        })

        await setCustomerSubscriptionSchedule(testEnv(), email, {
            cancelAtPeriodEnd: true,
            subscriptionEndsAt: "2026-06-15T00:00:00.000Z",
        })

        const customer = await getCustomerByEmail(testEnv(), email)
        expect(customer?.subscription_cancel_at_period_end).toBe(1)
        expect(customer?.subscription_ends_at).toBe("2026-06-15T00:00:00.000Z")
        expect(isCustomerEntitled(customer)).toBe(true)
    })

    it("clears cancel schedule when uncanceled", async () => {
        const { email } = await createTestCustomer(testEnv(), "clear@example.com", {
            planId: "pro",
            cancelAtPeriodEnd: true,
            subscriptionEndsAt: "2026-06-15T00:00:00.000Z",
        })

        await setCustomerSubscriptionSchedule(testEnv(), email, {
            cancelAtPeriodEnd: false,
            subscriptionEndsAt: null,
        })

        const customer = await getCustomerByEmail(testEnv(), email)
        expect(customer?.subscription_cancel_at_period_end).toBe(0)
        expect(customer?.subscription_ends_at).toBeNull()
    })
})
