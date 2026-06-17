import { FRAMER_PLUGIN_MARKETPLACE_ID } from "@knotcms/shared"
import { SELF, applyD1Migrations, env, reset } from "cloudflare:test"
import { afterEach, describe, expect, it } from "vitest"

const PLUGIN_ORIGIN = `https://${FRAMER_PLUGIN_MARKETPLACE_ID}.plugins.framercdn.com`
const VERSIONED_ORIGIN = `https://${FRAMER_PLUGIN_MARKETPLACE_ID}-v1abc.plugins.framercdn.com`

describe("GET /api/plugin/config CORS", () => {
    afterEach(async () => {
        await reset()
        await applyD1Migrations(env.DB, env.TEST_MIGRATIONS)
    })

    it("allows Framer production plugin origin", async () => {
        const response = await SELF.fetch("http://localhost/api/plugin/config", {
            headers: { Origin: PLUGIN_ORIGIN },
        })

        expect(response.status).toBe(200)
        expect(response.headers.get("Access-Control-Allow-Origin")).toBe(PLUGIN_ORIGIN)
        await expect(response.json()).resolves.toEqual({ webAppUrl: "http://localhost:8787" })
    })

    it("allows versioned Framer plugin origin", async () => {
        const response = await SELF.fetch("http://localhost/api/plugin/config", {
            headers: { Origin: VERSIONED_ORIGIN },
        })

        expect(response.status).toBe(200)
        expect(response.headers.get("Access-Control-Allow-Origin")).toBe(VERSIONED_ORIGIN)
    })

    it("allows local plugin dev origin", async () => {
        const origin = "http://localhost:5173"
        const response = await SELF.fetch("http://localhost/api/plugin/config", {
            headers: { Origin: origin },
        })

        expect(response.status).toBe(200)
        expect(response.headers.get("Access-Control-Allow-Origin")).toBe(origin)
    })

    it("rejects unrelated origins", async () => {
        const response = await SELF.fetch("http://localhost/api/plugin/config", {
            headers: { Origin: "https://evil.com" },
        })

        expect(response.status).toBe(200)
        expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull()
    })

    it("handles preflight for allowed origin", async () => {
        const response = await SELF.fetch("http://localhost/api/plugin/config", {
            method: "OPTIONS",
            headers: {
                Origin: PLUGIN_ORIGIN,
                "Access-Control-Request-Method": "GET",
            },
        })

        expect(response.status).toBe(204)
        expect(response.headers.get("Access-Control-Allow-Origin")).toBe(PLUGIN_ORIGIN)
        expect(response.headers.get("Access-Control-Allow-Methods")).toContain("GET")
    })
})
