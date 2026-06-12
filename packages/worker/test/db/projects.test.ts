import { applyD1Migrations, env, reset } from "cloudflare:test"
import { afterEach, describe, expect, it } from "vitest"
import { getProject, isProjectAutoSyncEligible } from "../../src/db/projects.js"
import { createTestCustomer, createTestProject } from "../helpers/db-fixtures.js"
import { testEnv } from "../helpers/test-env.js"

describe("isProjectAutoSyncEligible", () => {
    afterEach(async () => {
        await reset()
        await applyD1Migrations(env.DB, env.TEST_MIGRATIONS)
    })

    it("returns false when auto_sync is disabled", async () => {
        const { id: customerId } = await createTestCustomer(testEnv(), "off@example.com", {
            planId: "paid",
        })
        const projectId = await createTestProject(testEnv(), customerId, { autoSync: false })
        const project = await getProject(testEnv(), projectId)

        expect(await isProjectAutoSyncEligible(testEnv(), project!)).toBe(false)
    })

    it("returns false on basic plan even when auto_sync is enabled", async () => {
        const { id: customerId } = await createTestCustomer(testEnv(), "basic@example.com", {
            planId: "basic",
        })
        const projectId = await createTestProject(testEnv(), customerId)
        const project = await getProject(testEnv(), projectId)

        expect(await isProjectAutoSyncEligible(testEnv(), project!)).toBe(false)
    })

    it("returns true for entitled pro customer within project limit", async () => {
        const { id: customerId } = await createTestCustomer(testEnv(), "pro@example.com", {
            planId: "paid",
        })
        const projectId = await createTestProject(testEnv(), customerId)
        const project = await getProject(testEnv(), projectId)

        expect(await isProjectAutoSyncEligible(testEnv(), project!)).toBe(true)
    })

    it("returns false when customer is over project limit after downgrade", async () => {
        const { id: customerId } = await createTestCustomer(testEnv(), "over@example.com", {
            planId: "paid",
        })
        await createTestProject(testEnv(), customerId, { suffix: "a" })
        const projectId = await createTestProject(testEnv(), customerId, { suffix: "b" })
        const project = await getProject(testEnv(), projectId)

        expect(await isProjectAutoSyncEligible(testEnv(), project!)).toBe(false)
    })

    it("returns false when subscription is inactive", async () => {
        const { id: customerId } = await createTestCustomer(testEnv(), "inactive@example.com", {
            planId: "paid",
            subscriptionStatus: "inactive",
        })
        const projectId = await createTestProject(testEnv(), customerId)
        const project = await getProject(testEnv(), projectId)

        expect(await isProjectAutoSyncEligible(testEnv(), project!)).toBe(false)
    })

    it("stays eligible while canceled at period end with active subscription status", async () => {
        const { id: customerId } = await createTestCustomer(testEnv(), "cancel@example.com", {
            planId: "paid",
            subscriptionStatus: "active",
            cancelAtPeriodEnd: true,
            subscriptionEndsAt: "2026-06-15T00:00:00.000Z",
        })
        const projectId = await createTestProject(testEnv(), customerId)
        const project = await getProject(testEnv(), projectId)

        expect(await isProjectAutoSyncEligible(testEnv(), project!)).toBe(true)
    })
})
