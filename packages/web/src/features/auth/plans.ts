import { listCheckoutPlans, type PlanDefinition, type PlanId } from "@nocms/shared"

export type { PlanId, PlanDefinition }

export type CheckoutPlanId = Extract<PlanId, "pro" | "max">

export interface PlanCheckoutUrls {
    pro: string | null
    max: string | null
}

/** All paid checkout tiers from shared (includes Max — worker/webhooks still use it). */
export const PLANS = listCheckoutPlans()

/** Plans shown to Basic users on the profile page (new subscriptions). */
export const UI_CHECKOUT_PLANS = PLANS

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

/** Show Pro + Max checkout cards (Basic users only). */
export function showsPaidPlanOptions(planId: string | undefined): boolean {
    return planId === "basic"
}

/** Show Polar customer portal link (existing Pro / Max subscribers). */
export function showsManageBilling(planId: string | undefined): boolean {
    return planId === "pro" || planId === "max"
}
