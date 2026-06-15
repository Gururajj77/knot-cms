import { isPaidPlan, listCheckoutPlans, type PlanDefinition } from "@knotcms/shared"

export type { PlanDefinition }

export type PlanCheckoutUrls = {
    paid: string | null
}

/** Paid checkout tier from shared config. */
export const PAID_PLAN = listCheckoutPlans()[0]

export function resolvePlanCheckoutUrls(
    checkoutUrls: PlanCheckoutUrls | null | undefined
): PlanCheckoutUrls {
    return {
        paid: checkoutUrls?.paid?.trim() || null,
    }
}

/** Show subscribe card (Basic users only). */
export function showsPaidPlanOptions(storedPlanId: string | undefined): boolean {
    return !isPaidPlan(storedPlanId)
}

/** Show paid-customer billing controls (portal, seat changes). Uses stored plan, not effective limits. */
export function showsManageBilling(storedPlanId: string | undefined): boolean {
    return isPaidPlan(storedPlanId)
}
