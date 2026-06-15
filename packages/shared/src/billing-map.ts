import type { PlanId } from "./plans.js"

/**
 * Polar product ID → plan_id. Set when the seat-based project product exists in Polar.
 * Example: { "prod_xxx": "paid" }
 */
export const POLAR_PRODUCT_PLAN_MAP: Record<string, PlanId> = {}

export function planIdForPolarProduct(productId: string | null | undefined): PlanId | null {
    if (!productId?.trim()) return null
    return POLAR_PRODUCT_PLAN_MAP[productId] ?? null
}

/**
 * Dodo product ID → plan_id. Matches `DODO_PROJECT_PRODUCT_ID` from env (Phase 3 webhooks).
 */
export function planIdForDodoProduct(
    productId: string | null | undefined,
    configuredProductId?: string | null
): PlanId | null {
    const id = productId?.trim()
    if (!id) return null
    const configured = configuredProductId?.trim()
    if (configured && id === configured) return "paid"
    return null
}
