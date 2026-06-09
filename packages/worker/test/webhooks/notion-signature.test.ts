import { describe, expect, it } from "vitest"
import { verifyNotionWebhookSignature } from "../../src/webhooks/notion-signature.js"

describe("verifyNotionWebhookSignature", () => {
    it("accepts a valid Notion signature", async () => {
        const token = "secret_test_token"
        const body = '{"events":[]}'
        const key = await crypto.subtle.importKey(
            "raw",
            new TextEncoder().encode(token),
            { name: "HMAC", hash: "SHA-256" },
            false,
            ["sign"]
        )
        const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body))
        const hex = Array.from(new Uint8Array(sig))
            .map(b => b.toString(16).padStart(2, "0"))
            .join("")

        expect(await verifyNotionWebhookSignature(token, body, `sha256=${hex}`)).toBe(true)
    })

    it("rejects invalid signatures", async () => {
        expect(
            await verifyNotionWebhookSignature("secret", '{"events":[]}', "sha256=deadbeef")
        ).toBe(false)
    })

    it("rejects missing header", async () => {
        expect(await verifyNotionWebhookSignature("secret", "{}", undefined)).toBe(false)
    })
})
