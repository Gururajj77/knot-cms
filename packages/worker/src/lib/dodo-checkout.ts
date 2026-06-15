import type { Env } from "../env.js"
import type { CreateBillingCheckoutInput } from "./billing-checkout-api.js"

export interface DodoCheckoutSessionResponse {
    session_id: string
    checkout_url?: string | null
}

export function resolveDodoApiBaseUrl(env: Env): string {
    const override = env.DODO_API_BASE_URL?.trim()
    if (override) return override.replace(/\/$/, "")
    const mode = env.DODO_PAYMENTS_ENVIRONMENT?.trim().toLowerCase()
    if (mode === "live") return "https://live.dodopayments.com"
    return "https://test.dodopayments.com"
}

export async function createDodoCheckoutSession(
    env: Env,
    input: CreateBillingCheckoutInput
): Promise<{ url: string; sessionId: string }> {
    const apiKey = env.DODO_API_KEY?.trim()
    const productId = env.DODO_PROJECT_PRODUCT_ID?.trim()
    if (!apiKey || !productId) {
        throw new Error("Dodo checkout API is not configured")
    }

    const response = await fetch(`${resolveDodoApiBaseUrl(env)}/checkouts`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            product_cart: [{ product_id: productId, quantity: input.quantity }],
            customer: { email: input.email },
            metadata: {
                knotcms_customer_id: input.customerId,
                email: input.email,
            },
            return_url: input.returnUrl,
        }),
    })

    const body = (await response.json().catch(() => ({}))) as DodoCheckoutSessionResponse & {
        message?: string
        error?: string
    }

    if (!response.ok) {
        const detail = body.message ?? body.error ?? `Dodo checkout failed (${response.status})`
        throw new Error(detail)
    }

    const checkoutUrl = body.checkout_url?.trim()
    const sessionId = body.session_id?.trim()
    if (!checkoutUrl || !sessionId) {
        throw new Error("Dodo checkout response missing checkout_url")
    }

    return { url: checkoutUrl, sessionId }
}
