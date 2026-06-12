export const PRICE_PER_PROJECT_MONTHLY_USD = 9

export type PlanId = "basic" | "paid"

/** @deprecated Legacy tiers — normalized to `paid` at read time. */
export type LegacyPlanId = "pro" | "max"

export interface RateLimitPolicy {
    max: number
    windowMs: number
}

export interface PlanFeatures {
    autoSync: boolean
    autoPublish: boolean
}

export interface PlanDefinition {
    id: PlanId
    name: string
    tagline: string
    /** Sort order for pricing / admin lists. */
    displayOrder: number
    /** Static cap for basic; paid uses `subscription_project_limit` on the customer. */
    projectLimit: number
    /** null = unlimited syncs for this plan. */
    syncQuota: number | null
    syncQuotaPeriod: "lifetime" | "month" | null
    features: PlanFeatures
    /** Shown on marketing / billing cards. */
    marketingFeatures: string[]
    featured?: boolean
    /** Display price hint for checkout UI (actual billing is on Polar). */
    pricePerProjectMonthlyUsd?: number
    rateLimits: {
        framerVerify: RateLimitPolicy
        manualSync: RateLimitPolicy
        createProject: RateLimitPolicy
        setupSession: RateLimitPolicy
    }
}

export const PLANS: Record<PlanId, PlanDefinition> = {
    basic: {
        id: "basic",
        name: "Basic",
        tagline: "Try KnotCMS on one project",
        displayOrder: 0,
        projectLimit: 1,
        syncQuota: 3,
        syncQuotaPeriod: "lifetime",
        features: {
            autoSync: false,
            autoPublish: false,
        },
        marketingFeatures: [
            "1 project",
            "3 manual syncs (lifetime)",
            "Notion → Framer CMS sync",
        ],
        rateLimits: {
            framerVerify: { max: 10, windowMs: 60_000 },
            manualSync: { max: 2, windowMs: 60_000 },
            createProject: { max: 3, windowMs: 60_000 },
            setupSession: { max: 10, windowMs: 60_000 },
        },
    },
    paid: {
        id: "paid",
        name: "Project",
        tagline: "Full automation per Framer site",
        displayOrder: 1,
        projectLimit: 1,
        syncQuota: null,
        syncQuotaPeriod: null,
        featured: true,
        pricePerProjectMonthlyUsd: PRICE_PER_PROJECT_MONTHLY_USD,
        features: {
            autoSync: true,
            autoPublish: true,
        },
        marketingFeatures: [
            "Pay per project — buy 1, 10, or 100+",
            "Unlimited syncs",
            "Auto-sync on Notion changes",
            "Optional auto-publish to live",
            "Change quantity anytime in Polar",
        ],
        rateLimits: {
            framerVerify: { max: 10, windowMs: 60_000 },
            manualSync: { max: 15, windowMs: 60_000 },
            createProject: { max: 10, windowMs: 60_000 },
            setupSession: { max: 30, windowMs: 60_000 },
        },
    },
}

export const DEFAULT_PLAN_ID: PlanId = "basic"

const PAID_PLAN_IDS: PlanId[] = ["paid"]

export function isPlanId(value: string): value is PlanId {
    return value in PLANS
}

/** Map stored plan_id (including legacy pro/max) to a current PlanId. */
export function normalizePlanId(value: string | null | undefined): PlanId {
    if (value === "pro" || value === "max") return "paid"
    if (value && isPlanId(value)) return value
    return DEFAULT_PLAN_ID
}

export function isPaidPlan(planId: string | null | undefined): boolean {
    return normalizePlanId(planId) === "paid"
}

export function getPlan(planId: string | null | undefined): PlanDefinition {
    return PLANS[normalizePlanId(planId)]
}

export function listAllPlans(): PlanDefinition[] {
    return Object.values(PLANS).sort((a, b) => a.displayOrder - b.displayOrder)
}

/** Plans shown on the public checkout / pricing page. */
export function listCheckoutPlans(): PlanDefinition[] {
    return PAID_PLAN_IDS.map(id => PLANS[id])
}

/** Plans that do not require an active Polar subscription. */
export function isFreeAccessPlan(planId: string | null | undefined): boolean {
    return normalizePlanId(planId) === "basic"
}

export interface CustomerProjectLimitInput {
    plan_id: string
    subscription_project_limit?: number | null
}

/** Effective project cap for a customer (Polar seat count for paid). */
export function effectiveProjectLimit(customer: CustomerProjectLimitInput): number {
    const planId = normalizePlanId(customer.plan_id)
    if (planId === "basic") return PLANS.basic.projectLimit
    const seats = customer.subscription_project_limit
    if (typeof seats === "number" && seats > 0) return seats
    return 1
}

export type PlanRateLimitAction = keyof PlanDefinition["rateLimits"]

/** Burst rate limits — paid tier scales with seat count (project slots purchased). */
export function effectiveRateLimit(
    customer: CustomerProjectLimitInput,
    action: PlanRateLimitAction
): RateLimitPolicy {
    const planId = normalizePlanId(customer.plan_id)
    const base = PLANS[planId].rateLimits[action]
    if (planId === "basic") return base

    const seats = effectiveProjectLimit(customer)
    switch (action) {
        case "createProject":
        case "setupSession":
            return {
                max: Math.max(base.max, Math.min(seats * 3, 90)),
                windowMs: base.windowMs,
            }
        case "manualSync":
            return {
                max: Math.max(base.max, Math.min(seats * 5, 120)),
                windowMs: base.windowMs,
            }
        case "framerVerify":
            return {
                max: Math.max(base.max, Math.min(seats * 2, 40)),
                windowMs: base.windowMs,
            }
        default:
            return base
    }
}

export function syncRemaining(plan: PlanDefinition, syncCount: number): number | null {
    if (plan.syncQuota === null) return null
    return Math.max(0, plan.syncQuota - syncCount)
}

/** True when the customer has more projects than their current plan allows (e.g. after downgrade). */
export function isOverProjectLimit(projectCount: number, projectLimit: number): boolean {
    return projectCount > projectLimit
}

export function excessProjectCount(projectCount: number, projectLimit: number): number {
    return Math.max(0, projectCount - projectLimit)
}
