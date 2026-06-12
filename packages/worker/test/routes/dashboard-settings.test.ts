import { SELF, applyD1Migrations, env, reset } from "cloudflare:test"
import { afterEach, describe, expect, it } from "vitest"
import { getProject } from "../../src/db/projects.js"
import { createTestCustomer, createTestProject } from "../helpers/db-fixtures.js"
import { sessionCookieHeader } from "../helpers/session.js"
import { testEnv } from "../helpers/test-env.js"

async function patchJson(
    path: string,
    cookie: string,
    body: Record<string, unknown>
): Promise<Response> {
    return SELF.fetch(`http://localhost${path}`, {
        method: "PATCH",
        headers: {
            Cookie: cookie,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    })
}

describe("PATCH /api/dashboard/projects/:id/automation", () => {
    afterEach(async () => {
        await reset()
        await applyD1Migrations(env.DB, env.TEST_MIGRATIONS)
    })

    it("enables auto-sync for an entitled pro customer within limits", async () => {
        const customer = await createTestCustomer(testEnv(), "auto@example.com", { planId: "paid" })
        const projectId = await createTestProject(testEnv(), customer.id, { autoSync: false })
        const cookie = await sessionCookieHeader(testEnv(), customer.email, customer.id)

        const response = await patchJson(
            `/api/dashboard/projects/${projectId}/automation`,
            cookie,
            { autoSync: true }
        )

        expect(response.status).toBe(200)
        const project = await getProject(testEnv(), projectId)
        expect(project?.auto_sync).toBe(1)
    })

    it("blocks enabling auto-sync when over project limit", async () => {
        const customer = await createTestCustomer(testEnv(), "auto-blocked@example.com", {
            planId: "paid",
        })
        await createTestProject(testEnv(), customer.id, { suffix: "one", autoSync: false })
        const projectId = await createTestProject(testEnv(), customer.id, {
            suffix: "two",
            autoSync: false,
        })
        const cookie = await sessionCookieHeader(testEnv(), customer.email, customer.id)

        const response = await patchJson(
            `/api/dashboard/projects/${projectId}/automation`,
            cookie,
            { autoSync: true }
        )

        expect(response.status).toBe(403)
        const body = (await response.json()) as { code: string; details?: { reason?: string } }
        expect(body.code).toBe("PLAN_LIMIT")
        expect(body.details?.reason).toBe("projects_over_limit")

        const project = await getProject(testEnv(), projectId)
        expect(project?.auto_sync).toBe(0)
    })

    it("allows disabling auto-sync when over project limit", async () => {
        const customer = await createTestCustomer(testEnv(), "auto-off@example.com", {
            planId: "paid",
        })
        await createTestProject(testEnv(), customer.id, { suffix: "one" })
        const projectId = await createTestProject(testEnv(), customer.id, { suffix: "two" })
        const cookie = await sessionCookieHeader(testEnv(), customer.email, customer.id)

        const response = await patchJson(
            `/api/dashboard/projects/${projectId}/automation`,
            cookie,
            { autoSync: false }
        )

        expect(response.status).toBe(200)
        const project = await getProject(testEnv(), projectId)
        expect(project?.auto_sync).toBe(0)
    })

    it("blocks auto-sync on basic plan", async () => {
        const customer = await createTestCustomer(testEnv(), "basic-auto@example.com", {
            planId: "basic",
        })
        const projectId = await createTestProject(testEnv(), customer.id, { autoSync: false })
        const cookie = await sessionCookieHeader(testEnv(), customer.email, customer.id)

        const response = await patchJson(
            `/api/dashboard/projects/${projectId}/automation`,
            cookie,
            { autoSync: true }
        )

        expect(response.status).toBe(403)
        const body = (await response.json()) as { code: string; details?: { feature?: string } }
        expect(body.code).toBe("PLAN_LIMIT")
        expect(body.details?.feature).toBe("autoSync")
    })
})

describe("PATCH /api/dashboard/projects/:id/publish", () => {
    afterEach(async () => {
        await reset()
        await applyD1Migrations(env.DB, env.TEST_MIGRATIONS)
    })

    it("blocks enabling auto-publish when over project limit", async () => {
        const customer = await createTestCustomer(testEnv(), "publish-blocked@example.com", {
            planId: "paid",
        })
        await createTestProject(testEnv(), customer.id, { suffix: "pub-one", autoPublish: false })
        const projectId = await createTestProject(testEnv(), customer.id, {
            suffix: "pub-two",
            autoPublish: false,
        })
        const cookie = await sessionCookieHeader(testEnv(), customer.email, customer.id)

        const response = await patchJson(
            `/api/dashboard/projects/${projectId}/publish`,
            cookie,
            { autoPublish: true }
        )

        expect(response.status).toBe(403)
        const body = (await response.json()) as { code: string; details?: { reason?: string } }
        expect(body.code).toBe("PLAN_LIMIT")
        expect(body.details?.reason).toBe("projects_over_limit")
    })

    it("enables auto-publish for entitled pro customer within limits", async () => {
        const customer = await createTestCustomer(testEnv(), "publish@example.com", { planId: "paid" })
        const projectId = await createTestProject(testEnv(), customer.id, { autoPublish: false })
        const cookie = await sessionCookieHeader(testEnv(), customer.email, customer.id)

        const response = await patchJson(
            `/api/dashboard/projects/${projectId}/publish`,
            cookie,
            { autoPublish: true }
        )

        expect(response.status).toBe(200)
        const project = await getProject(testEnv(), projectId)
        expect(project?.auto_publish).toBe(1)
    })
})
