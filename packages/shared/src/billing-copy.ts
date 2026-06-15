import type { BillingProvider } from "./billing.js"

export function billingMerchantLabel(provider: BillingProvider | string | null | undefined): string {
    if (provider === "dodo") return "Dodo Payments"
    if (provider === "polar") return "Polar"
    return "our billing provider"
}

export function billingPortalLabel(provider: BillingProvider | string | null | undefined): string {
    if (provider === "dodo") return "Dodo customer portal"
    if (provider === "polar") return "Polar customer portal"
    return "billing portal"
}
