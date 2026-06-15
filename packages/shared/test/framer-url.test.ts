import { describe, expect, it } from "vitest"
import {
    buildFramerProjectUrlFromEditorId,
    extractFramerProjectSlug,
    framerProjectHashIdFromUrl,
    isAllowedFramerProjectUrl,
    normalizeFramerProjectUrl,
} from "../src/framer-url.js"

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

    it("extracts slug and hash id from project URLs", () => {
        expect(extractFramerProjectSlug("https://framer.com/projects/abc123/")).toBe("abc123")
        expect(extractFramerProjectSlug("https://www.framer.com/projects/My Site--deadbeef")).toBe(
            "My Site--deadbeef"
        )
        expect(
            framerProjectHashIdFromUrl("https://framer.com/projects/My Site--deadbeef")
        ).toBe("deadbeef")
        expect(framerProjectHashIdFromUrl("https://framer.com/projects/abc123")).toBe("abc123")
    })

    it("builds canonical project URL from editor id", () => {
        expect(buildFramerProjectUrlFromEditorId("deadbeef")).toBe(
            "https://framer.com/projects/deadbeef"
        )
    })
})
