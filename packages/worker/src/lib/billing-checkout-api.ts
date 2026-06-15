import {
    MAX_CHECKOUT_PROJECT_QUANTITY,
    MIN_CHECKOUT_PROJECT_QUANTITY,
} from "@knotcms/shared"
import type { Env } from "../env.js"
import { resolveBillingProvider } from "./billing-config.js"
import { resolveBillingCheckoutUrl } from "./billing-checkout.js"
import { createDodoCheckoutSession } from "./dodo-checkout.js"

export interface CreateBillingCheckoutInput {
    email: string
    customerId: string
    quantity: number
    returnUrl: string
}

export function parseCheckoutQuantity(value: unknown): number | null {
    const quantity =
        typeof value === "number"
            ? value
            : typeof value === "string"
              ? Number.parseInt(value, 10)
              : Number.NaN
    if (!Number.isFinite(quantity)) return null
    if (quantity < MIN_CHECKOUT_PROJECT_QUANTITY || quantity > MAX_CHECKOUT_PROJECT_QUANTITY) {
        return null
    }
    return Math.floor(quantity)
}

export function canUseDodoCheckoutApi(env: Env): boolean {
    if (resolveBillingProvider(env) !== "dodo") return false
    return Boolean(env.DODO_API_KEY?.trim() && env.DODO_PROJECT_PRODUCT_ID?.trim())
}

export function usesBillingCheckoutApi(env: Env): boolean {
    return canUseDodoCheckoutApi(env)
}

export async function createBillingCheckout(
    env: Env,
    input: CreateBillingCheckoutInput
): Promise<{ url: string; sessionId?: string }> {
    const provider = resolveBillingProvider(env)
    if (provider === "dodo") {
        if (!canUseDodoCheckoutApi(env)) {
            throw new Error("Dodo checkout API is not configured")
        }
        return createDodoCheckoutSession(env, input)
    }

    if (provider === "polar") {
        const url = resolveBillingCheckoutUrl(env)
        if (!url) {
            throw new Error("Checkout URL is not configured")
        }
        return { url }
    }

    throw new Error("Billing provider not configured")
}
