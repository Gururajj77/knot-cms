import { applyD1Migrations, env, reset } from "cloudflare:test"
import { afterEach, describe, expect, it } from "vitest"
import {
    ensureDevCustomer,
    getCustomerById,
    setCustomerPlanId,
} from "../../src/db/customers.js"
import {
    assertProjectLimit,
    assertSyncAllowed,
    assertSyncQuota,
    assertWithinProjectUsageLimit,
    customerOverProjectLimit,
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

    it("paid requires active subscription", async () => {
        const customerId = await ensureDevCustomer(testEnv(), "paid@example.com")
        await setCustomerPlanId(testEnv(), customerId, "paid")
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

    it("assertWithinProjectUsageLimit allows projects at plan limit", async () => {
        const customerId = await ensureDevCustomer(testEnv(), "at-limit@example.com")
        await setCustomerPlanId(testEnv(), customerId, "paid")
        await testEnv().DB.prepare(`UPDATE customers SET subscription_status = 'active' WHERE id = ?`)
            .bind(customerId)
            .run()
        const projectId = crypto.randomUUID()
        await testEnv().DB.prepare(
            `INSERT INTO projects (
                id, customer_id, framer_project_url, framer_collection_id,
                source_provider, source_data_source_id, slug_source_property_id
            ) VALUES (?, ?, 'https://framer.com/p', 'col', 'notion', 'ds-1', 'slug')`
        )
            .bind(projectId, customerId)
            .run()

        const customer = await getCustomerById(testEnv(), customerId)
        await expect(assertWithinProjectUsageLimit(testEnv(), customer!)).resolves.toBeUndefined()
    })

    it("assertWithinProjectUsageLimit blocks when over plan limit after downgrade", async () => {
        const customerId = await ensureDevCustomer(testEnv(), "over-limit@example.com")
        await setCustomerPlanId(testEnv(), customerId, "paid")
        await testEnv().DB.prepare(`UPDATE customers SET subscription_status = 'active' WHERE id = ?`)
            .bind(customerId)
            .run()

        for (let i = 0; i < 3; i++) {
            await testEnv().DB.prepare(
                `INSERT INTO projects (
                    id, customer_id, framer_project_url, framer_collection_id,
                    source_provider, source_data_source_id, slug_source_property_id
                ) VALUES (?, ?, ?, 'col', 'notion', ?, 'slug')`
            )
                .bind(crypto.randomUUID(), customerId, `https://framer.com/p-${i}`, `ds-${i}`)
                .run()
        }

        const customer = await getCustomerById(testEnv(), customerId)
        await expect(assertWithinProjectUsageLimit(testEnv(), customer!)).rejects.toMatchObject({
            code: "PLAN_LIMIT",
            details: { reason: "projects_over_limit", current: 3, limit: 1 },
        })
    })

    it("isPlanEntitled stays true for canceled-at-period-end paid customers", async () => {
        const customerId = await ensureDevCustomer(testEnv(), "cancel-entitled@example.com")
        await setCustomerPlanId(testEnv(), customerId, "paid")
        await testEnv().DB.prepare(
            `UPDATE customers SET
                subscription_status = 'active',
                subscription_cancel_at_period_end = 1,
                subscription_ends_at = '2026-06-15T00:00:00.000Z'
             WHERE id = ?`
        )
            .bind(customerId)
            .run()

        const customer = await getCustomerById(testEnv(), customerId)
        expect(isPlanEntitled(customer)).toBe(true)
    })

    it("customerOverProjectLimit is true when project count exceeds plan limit", async () => {
        const customerId = await ensureDevCustomer(testEnv(), "over-count@example.com")
        await setCustomerPlanId(testEnv(), customerId, "paid")
        const customer = await getCustomerById(testEnv(), customerId)
        expect(customerOverProjectLimit(2, customer!)).toBe(true)
        expect(customerOverProjectLimit(1, customer!)).toBe(false)
    })

    it("assertSyncAllowed rejects sync when over project limit", async () => {
        const customerId = await ensureDevCustomer(testEnv(), "sync-blocked@example.com")
        await setCustomerPlanId(testEnv(), customerId, "paid")
        await testEnv().DB.prepare(`UPDATE customers SET subscription_status = 'active' WHERE id = ?`)
            .bind(customerId)
            .run()

        for (let i = 0; i < 2; i++) {
            await testEnv().DB.prepare(
                `INSERT INTO projects (
                    id, customer_id, framer_project_url, framer_collection_id,
                    source_provider, source_data_source_id, slug_source_property_id
                ) VALUES (?, ?, ?, 'col', 'notion', ?, 'slug')`
            )
                .bind(crypto.randomUUID(), customerId, `https://framer.com/sync-${i}`, `ds-sync-${i}`)
                .run()
        }

        await expect(assertSyncAllowed(testEnv(), customerId)).rejects.toMatchObject({
            code: "PLAN_LIMIT",
        })
    })
})
