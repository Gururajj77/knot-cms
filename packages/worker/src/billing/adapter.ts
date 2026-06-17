import type { BillingProvider } from "@knotcms/shared"
import { resolveBillingProvider } from "../lib/billing-config.js"
import { dodoBillingAdapter } from "./dodo-adapter.js"
import { polarBillingAdapter } from "./polar-adapter.js"

export type { BillingProvider, CustomerSubscriptionStatus, NormalizedSubscriptionEvent } from "@knotcms/shared"

export interface BillingWebhookEvent {
    type: string
    data: unknown
}

export interface BillingAdapter {
    readonly provider: BillingProvider
    verifyWebhook(rawBody: string, headers: Headers, env: import("../env.js").Env): Promise<BillingWebhookEvent>
    handleWebhookEvent(env: import("../env.js").Env, event: BillingWebhookEvent): Promise<void>
}

export { getBillingWebhookConfigError } from "../lib/billing-config.js"

export function getBillingAdapter(env: import("../env.js").Env): BillingAdapter {
    const provider = resolveBillingProvider(env)
    if (provider === "polar") {
        return polarBillingAdapter
    }
    if (provider === "dodo") {
        return dodoBillingAdapter
    }
    throw new Error(`Unsupported billing provider: ${env.BILLING_PROVIDER ?? "(unset)"}`)
}
