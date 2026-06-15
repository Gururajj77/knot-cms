import { describe, expect, it } from "vitest"
import { getDriveWebhookEndpointUrl, getWebhookPublicBaseUrl } from "../../src/lib/public-origin.js"
import { testEnv } from "../helpers/test-env.js"

describe("getWebhookPublicBaseUrl", () => {
    it("prefers WEBHOOK_PUBLIC_URL for local tunnel dev", () => {
        const base = getWebhookPublicBaseUrl(
            testEnv({
                WORKER_PUBLIC_URL: "http://localhost:8787",
                WEBHOOK_PUBLIC_URL: "https://dev-api.knotcms.com",
            })
        )
        expect(base).toBe("https://dev-api.knotcms.com")
    })

    it("builds Google Drive webhook path from public base", () => {
        const url = getDriveWebhookEndpointUrl(
            testEnv({ WEBHOOK_PUBLIC_URL: "https://dev-api.knotcms.com" })
        )
        expect(url).toBe("https://dev-api.knotcms.com/webhooks/google-drive")
    })
})
