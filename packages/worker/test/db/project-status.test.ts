import { applyD1Migrations, env, reset } from "cloudflare:test"
import { afterEach, describe, expect, it } from "vitest"
import { SELF } from "cloudflare:test"
import { listProjectsByCustomerId } from "../../src/db/projects.js"
import { createTestCustomer, createTestProject } from "../helpers/db-fixtures.js"
import { sessionCookieHeader } from "../helpers/session.js"
import { testEnv } from "../helpers/test-env.js"

describe("project status entitlement", () => {
    afterEach(async () => {
        await reset()
        await applyD1Migrations(env.DB, env.TEST_MIGRATIONS)
    })

    it("reports active license for basic customers", async () => {
        const customer = await createTestCustomer(testEnv(), "basic-license@example.com", {
            planId: "basic",
            subscriptionStatus: "inactive",
        })
        await createTestProject(testEnv(), customer.id)
        const projects = await listProjectsByCustomerId(testEnv(), customer.id)
        expect(projects).toHaveLength(1)
        expect(projects[0]?.licenseStatus).toBe("active")
    })

    it("allows lapsed paid customers to list dashboard projects", async () => {
        const customer = await createTestCustomer(testEnv(), "lapsed@example.com", {
            planId: "paid",
            subscriptionStatus: "inactive",
        })
        await createTestProject(testEnv(), customer.id)
        const cookie = await sessionCookieHeader(testEnv(), customer.email, customer.id)

        const response = await SELF.fetch("http://localhost/api/dashboard/projects", {
            headers: { Cookie: cookie },
        })

        expect(response.status).toBe(200)
        const body = (await response.json()) as { projects: { id: string }[] }
        expect(body.projects).toHaveLength(1)
    })
})
