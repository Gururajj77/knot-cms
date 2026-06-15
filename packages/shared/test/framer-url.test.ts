import { describe, expect, it } from "vitest"
import { isAllowedFramerProjectUrl, normalizeFramerProjectUrl } from "../src/framer-url.js"

describe("framer URL helpers", () => {
    it("normalizes and allows framer.com project URLs", () => {
        const url = normalizeFramerProjectUrl("https://framer.com/projects/abc123/")
        expect(url).toBe("https://framer.com/projects/abc123")
        expect(isAllowedFramerProjectUrl(url)).toBe(true)
    })

    it("adds https when missing", () => {
        expect(normalizeFramerProjectUrl("framer.com/projects/abc")).toBe(
            "https://framer.com/projects/abc"
        )
    })

    it("rejects non-framer hosts", () => {
        expect(isAllowedFramerProjectUrl("https://evil.com/projects/abc")).toBe(false)
    })

    it("rejects http", () => {
        expect(isAllowedFramerProjectUrl("http://framer.com/projects/abc")).toBe(false)
    })
})
