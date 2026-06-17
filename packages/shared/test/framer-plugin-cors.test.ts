import { describe, expect, it } from "vitest"
import {
    FRAMER_PLUGIN_MARKETPLACE_ID,
    isAllowedPluginApiOrigin,
    isFramerPluginOrigin,
    isPluginDevOrigin,
} from "../src/framer-plugin-cors.js"

describe("isFramerPluginOrigin", () => {
    it("allows production plugin CDN origin", () => {
        expect(
            isFramerPluginOrigin(`https://${FRAMER_PLUGIN_MARKETPLACE_ID}.plugins.framercdn.com`)
        ).toBe(true)
    })

    it("allows versioned plugin CDN origin", () => {
        expect(
            isFramerPluginOrigin(
                `https://${FRAMER_PLUGIN_MARKETPLACE_ID}-abc123.plugins.framercdn.com`
            )
        ).toBe(true)
    })

    it("rejects unrelated origins", () => {
        expect(isFramerPluginOrigin("https://evil.com")).toBe(false)
        expect(isFramerPluginOrigin("https://other.plugins.framercdn.com")).toBe(false)
        expect(isFramerPluginOrigin("http://knotcms.plugins.framercdn.com")).toBe(false)
    })
})

describe("isPluginDevOrigin", () => {
    it("allows local dev hosts", () => {
        expect(isPluginDevOrigin("http://localhost:5173")).toBe(true)
        expect(isPluginDevOrigin("https://127.0.0.1:8787")).toBe(true)
    })

    it("rejects non-local hosts", () => {
        expect(isPluginDevOrigin("https://app.knotcms.com")).toBe(false)
    })
})

describe("isAllowedPluginApiOrigin", () => {
    it("combines Framer CDN and dev origins", () => {
        expect(isAllowedPluginApiOrigin(`https://${FRAMER_PLUGIN_MARKETPLACE_ID}.plugins.framercdn.com`)).toBe(
            true
        )
        expect(isAllowedPluginApiOrigin("http://localhost:5173")).toBe(true)
        expect(isAllowedPluginApiOrigin(undefined)).toBe(false)
        expect(isAllowedPluginApiOrigin("https://app.knotcms.com")).toBe(false)
    })
})
