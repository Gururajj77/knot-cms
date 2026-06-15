import { describe, expect, it } from "vitest"
import { getBillingAdapter } from "../../src/billing/adapter.js"
import { dodoTestEnv, testEnv } from "../helpers/test-env.js"

describe("getBillingAdapter", () => {
    it("returns polar adapter", () => {
        const adapter = getBillingAdapter(testEnv())
        expect(adapter.provider).toBe("polar")
    })

    it("returns dodo adapter", () => {
        const adapter = getBillingAdapter(dodoTestEnv())
        expect(adapter.provider).toBe("dodo")
    })
})
