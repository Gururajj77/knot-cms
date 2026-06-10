import type { Env } from "../env.js"

export type PlanCheckoutUrls = {
    pro: string | null
    max: string | null
}

function trimUrl(value: string | undefined): string | null {
    const trimmed = value?.trim()
    return trimmed || null
}

/** Resolve Polar checkout links per plan. Legacy BILLING_CHECKOUT_URL applies to Pro only. */
export function resolveBillingCheckoutUrls(env: Env): PlanCheckoutUrls {
    const legacy = trimUrl(env.BILLING_CHECKOUT_URL)
    return {
        pro: trimUrl(env.BILLING_CHECKOUT_URL_PRO) ?? legacy,
        max: trimUrl(env.BILLING_CHECKOUT_URL_MAX),
    }
}

/** Primary checkout link for generic upgrade CTAs (Pro first, then Max). */
export function primaryBillingCheckoutUrl(urls: PlanCheckoutUrls): string | null {
    return urls.pro ?? urls.max
}

export function resolveBillingCustomerPortalUrl(env: Env): string | null {
    return trimUrl(env.BILLING_CUSTOMER_PORTAL_URL)
}
