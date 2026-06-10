import { listCheckoutPlans, type PlanDefinition, type PlanId } from "@nocms/shared"

export type { PlanId, PlanDefinition }

export type CheckoutPlanId = Extract<PlanId, "pro" | "max">

export interface PlanCheckoutUrls {
    pro: string | null
    max: string | null
}

/** All paid checkout tiers from shared (includes Max — worker/webhooks still use it). */
export const PLANS = listCheckoutPlans()

/** Plans shown on the marketing / upgrade UI. Max hidden until portal upgrade flow ships. */
export const UI_CHECKOUT_PLANS = PLANS.filter(plan => plan.id === "pro")

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

/** Show Pro checkout on the plans page (Basic only for now). */
export function showsPaidPlanOptions(planId: string | undefined): boolean {
    return planId === "basic"
}
