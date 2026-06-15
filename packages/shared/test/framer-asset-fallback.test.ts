import { describe, expect, it } from "vitest"
import {
    isFramerAssetUploadError,
    stripImageFieldDataFromItems,
} from "../src/framer-fields.js"

describe("framer asset fallback", () => {
    it("detects Framer asset upload failures", () => {
        expect(
            isFramerAssetUploadError(
                new Error(
                    "Assets upload from URL https://i.imgur.com/x.jpeg failed. Could not get asset, response code 429"
                )
            )
        ).toBe(true)
    })

    it("strips image field values from sync items", () => {
        const { items, strippedCount } = stripImageFieldDataFromItems([
            {
                id: "row-1",
                slug: "post",
                draft: false,
                fieldData: {
                    cover: { type: "image", value: "https://i.imgur.com/x.jpeg" },
                    title: { type: "string", value: "Hello" },
                },
            },
        ])

        expect(strippedCount).toBe(1)
        expect(items[0]?.fieldData.cover).toBeUndefined()
        expect(items[0]?.fieldData.title).toEqual({ type: "string", value: "Hello" })
    })
})
