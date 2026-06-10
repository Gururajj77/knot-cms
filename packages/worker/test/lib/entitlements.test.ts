import { applyD1Migrations, env, reset } from "cloudflare:test"
import { afterEach, describe, expect, it } from "vitest"
import {
    ensureDevCustomer,
    getCustomerById,
    setCustomerPlanId,
} from "../../src/db/customers.js"
import {
    assertProjectLimit,
    assertSyncQuota,
    getCustomerUsage,
    isPlanEntitled,
    resolvePlanId,
} from "../../src/lib/entitlements.js"
import { testEnv } from "../helpers/test-env.js"

describe("entitlements", () => {
    afterEach(async () => {
        await reset()
        await applyD1Migrations(env.DB, env.TEST_MIGRATIONS)
    })

    it("resolves plan_id from customer row", async () => {
        const customerId = await ensureDevCustomer(testEnv(), "dev@example.com")
        const customer = await getCustomerById(testEnv(), customerId)
        expect(customer).not.toBeNull()
        expect(resolvePlanId(customer)).toBe("basic")
    })

    it("basic is entitled without subscription", async () => {
        const customerId = await ensureDevCustomer(testEnv(), "free@example.com")
        const customer = await getCustomerById(testEnv(), customerId)
        expect(isPlanEntitled(customer)).toBe(true)
    })

    it("pro requires active subscription", async () => {
        const customerId = await ensureDevCustomer(testEnv(), "paid@example.com")
        await setCustomerPlanId(testEnv(), customerId, "pro")
        await testEnv().DB.prepare(`UPDATE customers SET subscription_status = 'inactive' WHERE id = ?`)
            .bind(customerId)
            .run()
        const inactive = await getCustomerById(testEnv(), customerId)
        expect(isPlanEntitled(inactive)).toBe(false)

        await testEnv().DB.prepare(`UPDATE customers SET subscription_status = 'active' WHERE id = ?`)
            .bind(customerId)
            .run()
        const active = await getCustomerById(testEnv(), customerId)
        expect(isPlanEntitled(active)).toBe(true)
    })

    it("assertSyncQuota blocks basic at limit", async () => {
        const customerId = await ensureDevCustomer(testEnv(), "quota@example.com")
        await testEnv().DB.prepare(`UPDATE customers SET sync_count = 3 WHERE id = ?`)
            .bind(customerId)
            .run()
        const customer = await getCustomerById(testEnv(), customerId)
        await expect(assertSyncQuota(customer!)).rejects.toMatchObject({ code: "PLAN_LIMIT" })
    })

    it("getCustomerUsage reports sync remaining", async () => {
        const customerId = await ensureDevCustomer(testEnv(), "usage@example.com")
        await testEnv().DB.prepare(`UPDATE customers SET sync_count = 1 WHERE id = ?`)
            .bind(customerId)
            .run()
        const customer = await getCustomerById(testEnv(), customerId)
        const usage = await getCustomerUsage(testEnv(), customer!)
        expect(usage.syncRemaining).toBe(2)
        expect(usage.projectCount).toBe(0)
    })

    it("assertProjectLimit allows first project on basic", async () => {
        const customerId = await ensureDevCustomer(testEnv(), "projects@example.com")
        const customer = await getCustomerById(testEnv(), customerId)
        await expect(assertProjectLimit(testEnv(), customer!)).resolves.toBeUndefined()
    })
})
