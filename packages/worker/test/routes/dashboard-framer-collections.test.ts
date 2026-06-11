import { SELF, applyD1Migrations, env, reset } from "cloudflare:test"
import { afterEach, describe, expect, it } from "vitest"
import { createTestCustomer } from "../helpers/db-fixtures.js"
import { sessionCookieHeader } from "../helpers/session.js"
import { testEnv } from "../helpers/test-env.js"

async function postCollections(
    cookie: string,
    body: Record<string, unknown>
): Promise<Response> {
    return SELF.fetch("http://localhost/api/dashboard/setup/framer/collections", {
        method: "POST",
        headers: {
            Cookie: cookie,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    })
}

describe("POST /api/dashboard/setup/framer/collections", () => {
    afterEach(async () => {
        await reset()
        await applyD1Migrations(env.DB, env.TEST_MIGRATIONS)
    })

    it("requires authentication", async () => {
        const response = await postCollections("", {
            framerProjectUrl: "https://framer.com/projects/abc123",
            framerApiKey: "test-api-key-1234",
        })

        expect(response.status).toBe(401)
    })

    it("validates request body", async () => {
        const customer = await createTestCustomer(testEnv(), "framer-invalid@example.com", {
            planId: "pro",
        })
        const cookie = await sessionCookieHeader(testEnv(), customer.email, customer.id)

        const response = await postCollections(cookie, {
            framerProjectUrl: "https://evil.com/projects/abc123",
            framerApiKey: "short",
        })

        expect(response.status).toBe(400)
    })
})
