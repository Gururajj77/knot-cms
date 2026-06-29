import { afterEach, describe, expect, it, vi } from "vitest"
import {
    formatSheetSourceTitle,
    listSheetTabs,
    parseGoogleSpreadsheetUrl,
    sheetTabFromGid,
} from "../src/google-sheets.js"

describe("parseGoogleSpreadsheetUrl", () => {
    it("parses spreadsheet id and gid from a share URL", () => {
        expect(
            parseGoogleSpreadsheetUrl(
                "https://docs.google.com/spreadsheets/d/abc123_XYZ/edit#gid=0"
            )
        ).toEqual({ spreadsheetId: "abc123_XYZ", sheetGid: 0 })
    })

    it("parses spreadsheet id without gid", () => {
        expect(parseGoogleSpreadsheetUrl("https://docs.google.com/spreadsheets/d/abc123/edit")).toEqual({
            spreadsheetId: "abc123",
            sheetGid: null,
        })
    })

    it("returns null for non-sheet URLs", () => {
        expect(parseGoogleSpreadsheetUrl("https://example.com")).toBeNull()
    })
})

describe("sheetTabFromGid", () => {
    it("prefers the tab matching the URL gid", () => {
        const tabs = [
            { sheetId: 0, title: "Sheet1" },
            { sheetId: 42, title: "Blog" },
        ]
        expect(sheetTabFromGid(tabs, 42)).toEqual({ sheetId: 42, title: "Blog" })
    })
})

describe("formatSheetSourceTitle", () => {
    it("joins spreadsheet and tab titles", () => {
        expect(formatSheetSourceTitle("Posts", "Published")).toBe("Posts / Published")
    })
})

describe("listSheetTabs", () => {
    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it("includes the default first tab when sheetId is 0", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => ({
                    sheets: [{ properties: { sheetId: 0, title: "Sheet1" } }],
                }),
            })
        )

        const tabs = await listSheetTabs("test-token", "spreadsheet-abc")

        expect(tabs).toEqual([{ sheetId: 0, title: "Sheet1" }])
    })
})
