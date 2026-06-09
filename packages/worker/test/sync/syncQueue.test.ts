import { describe, expect, it } from "vitest"
import { isSyncJobRetryable } from "../../src/sync/syncQueue.js"

describe("isSyncJobRetryable", () => {
    it("retries transient errors", () => {
        expect(isSyncJobRetryable("NOTION_API")).toBe(true)
        expect(isSyncJobRetryable("FRAMER_COLLECTION")).toBe(true)
        expect(isSyncJobRetryable("UNKNOWN")).toBe(true)
    })

    it("does not retry lock or config errors", () => {
        expect(isSyncJobRetryable("SYNC_IN_PROGRESS")).toBe(false)
        expect(isSyncJobRetryable("LICENSE_INACTIVE")).toBe(false)
        expect(isSyncJobRetryable("FRAMER_UNAUTHORIZED")).toBe(false)
    })
})
