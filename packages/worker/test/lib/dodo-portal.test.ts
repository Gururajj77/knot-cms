import { afterEach, describe, expect, it, vi } from "vitest"
import { createDodoCustomerPortalSession } from "../../src/lib/dodo-portal.js"
import { dodoTestEnv } from "../helpers/test-env.js"

describe("createDodoCustomerPortalSession", () => {
    afterEach(() => {
        vi.restoreAllMocks()
    })

    it("requests a portal link for the Dodo customer", async () => {
        const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(
            async () =>
                Response.json({
                    link: "https://portal.dodo.example/session/portal_test",
                })
        )
        vi.stubGlobal("fetch", fetchMock)

        const result = await createDodoCustomerPortalSession(dodoTestEnv(), {
            externalCustomerId: "cus_dodo_portal",
            returnUrl: "http://localhost:8787/profile/plans",
        })

        expect(result.url).toBe("https://portal.dodo.example/session/portal_test")
        expect(fetchMock).toHaveBeenCalledOnce()
        const calledUrl = String(fetchMock.mock.calls[0]![0])
        expect(calledUrl).toContain("/customers/cus_dodo_portal/customer-portal/session")
        expect(calledUrl).toContain("return_url=")
    })
})
