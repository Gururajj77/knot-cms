import type { PlanId } from "./plans.js"

/** Active Merchant-of-Record or manual entitlement source. */
export type BillingProvider = "polar" | "dodo" | "manual"

export function isBillingProvider(value: string | null | undefined): value is BillingProvider {
    return value === "polar" || value === "dodo" || value === "manual"
}

export type CustomerSubscriptionStatus = "active" | "inactive"

export const MIN_CHECKOUT_PROJECT_QUANTITY = 1
export const MAX_CHECKOUT_PROJECT_QUANTITY = 100

/**
 * Provider-agnostic billing event after webhook parsing.
 * Dodo adapter emits these in Phase 3; Polar keeps its native handler in Phase 1.
 */
export interface NormalizedSubscriptionEvent {
    email: string
    billingProvider: BillingProvider
    externalCustomerId: string | null
    externalSubscriptionId: string | null
    subscriptionStatus: CustomerSubscriptionStatus
    /** When set, upserts paid plan. When undefined, plan_id is not changed. */
    planId?: PlanId
    /** Seat count → customers.subscription_project_limit. null = no change. */
    quantity: number | null
    cancelAtPeriodEnd: boolean
    subscriptionEndsAt: string | null
    /** Next billing date from provider (Dodo next_billing_date). */
    subscriptionRenewsAt?: string | null
    /** Clear in-app seat-add lock when a new billing cycle starts. */
    resetSeatsAddLock?: boolean
}
