import { afterEach, describe, expect, it, vi } from "vitest"
import { createDodoCheckoutSession } from "../../src/lib/dodo-checkout.js"
import { TEST_DODO_PRODUCT_ID } from "../helpers/dodo-webhook.js"
import { dodoTestEnv } from "../helpers/test-env.js"

describe("createDodoCheckoutSession", () => {
    afterEach(() => {
        vi.restoreAllMocks()
    })

    it("posts product_cart with quantity to Dodo checkouts API", async () => {
        const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(
            async () =>
                Response.json({
                    session_id: "cks_test",
                    checkout_url: "https://checkout.dodo.example/session/cks_test",
                })
        )
        vi.stubGlobal("fetch", fetchMock)

        const result = await createDodoCheckoutSession(dodoTestEnv(), {
            email: "checkout@example.com",
            customerId: "cus_123",
            quantity: 3,
            returnUrl: "http://localhost:8787/profile/plans?billing=success",
        })

        expect(result).toEqual({
            url: "https://checkout.dodo.example/session/cks_test",
            sessionId: "cks_test",
        })

        expect(fetchMock).toHaveBeenCalledOnce()
        const [url, init] = fetchMock.mock.calls[0]!
        expect(init).toBeDefined()
        const payload = JSON.parse(String(init!.body)) as {
            product_cart: Array<{ product_id: string; quantity: number }>
            customer: { email: string }
            metadata: { knotcms_customer_id: string; email: string }
            return_url: string
        }
        expect(url).toBe("https://test.dodopayments.com/checkouts")
        expect(payload.product_cart).toEqual([{ product_id: TEST_DODO_PRODUCT_ID, quantity: 3 }])
        expect(payload.customer.email).toBe("checkout@example.com")
        expect(payload.metadata.knotcms_customer_id).toBe("cus_123")
    })
})
