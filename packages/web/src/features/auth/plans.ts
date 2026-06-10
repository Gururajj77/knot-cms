import { listCheckoutPlans, type PlanDefinition, type PlanId } from "@nocms/shared"

export type { PlanId, PlanDefinition }

export type CheckoutPlanId = Extract<PlanId, "pro" | "max">

/** Checkout URLs per plan — same URL until Polar has separate links. */
export interface PlanCheckoutUrls {
    pro: string | null
    max: string | null
}

/** Paid tiers for the pricing page (re-exported from shared plan registry). */
export const PLANS = listCheckoutPlans()

export function checkoutUrlForPlan(urls: PlanCheckoutUrls, planId: CheckoutPlanId): string | null {
    return urls[planId] ?? urls.pro ?? urls.max
}

export function resolvePlanCheckoutUrls(checkoutUrl: string | null | undefined): PlanCheckoutUrls {
    const url = checkoutUrl?.trim() || null
    return { pro: url, max: url }
}
