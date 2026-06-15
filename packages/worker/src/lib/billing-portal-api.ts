import type { Env } from "../env.js"
import { resolveBillingProvider } from "./billing-config.js"
import { resolveBillingCustomerPortalUrl } from "./billing-checkout.js"
import { createDodoCustomerPortalSession } from "./dodo-portal.js"

export function canUseDodoPortalApi(env: Env): boolean {
    if (resolveBillingProvider(env) !== "dodo") return false
    return Boolean(env.DODO_API_KEY?.trim())
}

export function usesBillingPortalApi(env: Env): boolean {
    return canUseDodoPortalApi(env)
}

export async function createBillingPortalSession(
    env: Env,
    input: {
        externalCustomerId: string | null
        returnUrl: string
    }
): Promise<{ url: string }> {
    const provider = resolveBillingProvider(env)
    if (provider === "dodo") {
        if (!canUseDodoPortalApi(env)) {
            const staticUrl = resolveBillingCustomerPortalUrl(env)
            if (staticUrl) return { url: staticUrl }
            throw new Error("Dodo customer portal is not configured")
        }
        const externalCustomerId = input.externalCustomerId?.trim()
        if (!externalCustomerId) {
            throw new Error(
                "No billing account linked yet. Complete checkout first, then click Refresh status."
            )
        }
        return createDodoCustomerPortalSession(env, {
            externalCustomerId,
            returnUrl: input.returnUrl,
        })
    }

    if (provider === "polar") {
        const url = resolveBillingCustomerPortalUrl(env)
        if (!url) {
            throw new Error("Customer portal URL is not configured")
        }
        return { url }
    }

    throw new Error("Billing provider not configured")
}
