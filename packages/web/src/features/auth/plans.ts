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
export function showsPaidPlanOptions(planId: string | undefined): boolean {
    return !isPaidPlan(planId)
}

/** Show paid customer billing portal (seat changes). */
export function showsManageBilling(planId: string | undefined): boolean {
    return isPaidPlan(planId)
}
