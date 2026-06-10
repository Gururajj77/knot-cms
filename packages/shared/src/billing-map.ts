import type { PlanId } from "./plans.js"

/**
 * Polar product ID → plan_id. Filled when products exist in Polar (commit 2).
 * Example: { "prod_xxx": "pro", "prod_yyy": "max" }
 */
export const POLAR_PRODUCT_PLAN_MAP: Record<string, PlanId> = {}

export function planIdForPolarProduct(productId: string | null | undefined): PlanId | null {
    if (!productId?.trim()) return null
    return POLAR_PRODUCT_PLAN_MAP[productId] ?? null
}
