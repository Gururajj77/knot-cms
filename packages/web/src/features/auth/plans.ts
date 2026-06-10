import { listCheckoutPlans, type PlanDefinition, type PlanId } from "@nocms/shared"

export type { PlanId, PlanDefinition }

export type CheckoutPlanId = Extract<PlanId, "pro" | "max">

export interface PlanCheckoutUrls {
    pro: string | null
    max: string | null
}

/** Paid tiers for the pricing page (re-exported from shared plan registry). */
export const PLANS = listCheckoutPlans()

export function checkoutUrlForPlan(urls: PlanCheckoutUrls, planId: CheckoutPlanId): string | null {
    return urls[planId] ?? null
}

export function resolvePlanCheckoutUrls(
    checkoutUrls: PlanCheckoutUrls | null | undefined
): PlanCheckoutUrls {
    return {
        pro: checkoutUrls?.pro?.trim() || null,
        max: checkoutUrls?.max?.trim() || null,
    }
}
