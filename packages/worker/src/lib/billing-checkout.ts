import type { Env } from "../env.js"

export type PlanCheckoutUrls = {
    paid: string | null
}

function trimUrl(value: string | undefined): string | null {
    const trimmed = value?.trim()
    return trimmed || null
}

/** Polar checkout link for the per-project seat-based product. */
export function resolveBillingCheckoutUrl(env: Env): string | null {
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
    return trimUrl(env.BILLING_CUSTOMER_PORTAL_URL)
}
