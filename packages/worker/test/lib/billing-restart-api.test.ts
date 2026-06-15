import { applyD1Migrations, reset } from "cloudflare:test"
import { env } from "cloudflare:workers"
import { afterEach, describe, expect, it, vi } from "vitest"
import { getCustomerByEmail } from "../../src/db/customers.js"
import { restartBillingWithSeats } from "../../src/lib/billing-restart-api.js"
import * as billingCheckoutApi from "../../src/lib/billing-checkout-api.js"
import * as dodoSubscription from "../../src/lib/dodo-subscription.js"
import { createTestCustomer } from "../helpers/db-fixtures.js"
import { dodoTestEnv } from "../helpers/test-env.js"

describe("restartBillingWithSeats", () => {
    afterEach(async () => {
        vi.restoreAllMocks()
        await reset()
        await applyD1Migrations(env.DB, env.TEST_MIGRATIONS)
    })

    it("sets subscription_status to inactive (not canceled) while pending checkout", async () => {
        vi.spyOn(dodoSubscription, "cancelDodoSubscriptionImmediately").mockResolvedValue(undefined)
        vi.spyOn(billingCheckoutApi, "createBillingCheckout").mockResolvedValue({
            url: "https://checkout.example/restart",
            sessionId: "cks_restart",
        })

        const testEnvironment = dodoTestEnv()
        const { email, id } = await createTestCustomer(testEnvironment, "restart-status@example.com", {
            planId: "paid",
            subscriptionStatus: "active",
            subscriptionProjectLimit: 3,
            billingProvider: "dodo",
            externalCustomerId: "cus_restart",
            externalSubscriptionId: "sub_restart",
        })

        const customer = await getCustomerByEmail(testEnvironment, email)
        expect(customer).not.toBeNull()

        await restartBillingWithSeats(testEnvironment, {
            customer: customer!,
            email,
            quantity: 2,
            returnUrl: "http://localhost:8787/profile/plans?billing=success",
        })

        const updated = await getCustomerByEmail(testEnvironment, email)
        expect(updated?.subscription_status).toBe("inactive")
        expect(updated?.subscription_status).not.toBe("canceled")
        expect(updated?.pending_checkout_quantity).toBe(2)
    })
})
