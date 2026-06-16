import { describe, expect, it } from "vitest"
import {
    RATE_LIMITED_CODE,
    RATE_LIMIT_MESSAGES,
    rateLimitErrorBody,
} from "../src/rate-limits.js"

describe("rate limits", () => {
    it("returns user-facing copy with a stable code", () => {
        const body = rateLimitErrorBody("manualSync")
        expect(body.code).toBe(RATE_LIMITED_CODE)
        expect(body.error).toBe(RATE_LIMIT_MESSAGES.manualSync)
        expect(body.error).toContain("minute")
    })

    it("covers every plan rate limit action", () => {
        const actions = [
            "manualSync",
            "framerVerify",
            "createProject",
            "setupSession",
            "projectRead",
            "webhookConfirm",
            "setupDataSource",
            "bootstrapDatabase",
        ] as const

        for (const action of actions) {
            expect(rateLimitErrorBody(action).code).toBe(RATE_LIMITED_CODE)
            expect(rateLimitErrorBody(action).error.length).toBeGreaterThan(10)
        }
    })
})
