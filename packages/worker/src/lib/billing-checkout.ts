import type { Env } from "../env.js"
import { resolveBillingProvider } from "./billing-config.js"

export type PlanCheckoutUrls = {
    paid: string | null
}

function trimUrl(value: string | undefined): string | null {
    const trimmed = value?.trim()
    return trimmed || null
}

/** Checkout link for the per-project seat-based product (provider-specific env). */
export function resolveBillingCheckoutUrl(env: Env): string | null {
    const provider = resolveBillingProvider(env)
    if (provider === "dodo") {
        return trimUrl(env.DODO_CHECKOUT_URL_PAID)
    }

    return (
        trimUrl(env.BILLING_CHECKOUT_URL_PAID) ??
        trimUrl(env.BILLING_CHECKOUT_URL_PRO) ??
        trimUrl(env.BILLING_CHECKOUT_URL)
    )
}

export function resolveBillingCheckoutUrls(env: Env): PlanCheckoutUrls {
    return { paid: resolveBillingCheckoutUrl(env) }
}

/** Primary checkout link for generic upgrade CTAs. */
export function primaryBillingCheckoutUrl(urls: PlanCheckoutUrls): string | null {
    return urls.paid
}

export function resolveBillingCustomerPortalUrl(env: Env): string | null {
    const provider = resolveBillingProvider(env)
    if (provider === "dodo") {
        return trimUrl(env.DODO_CUSTOMER_PORTAL_URL)
    }
    return trimUrl(env.BILLING_CUSTOMER_PORTAL_URL)
}
