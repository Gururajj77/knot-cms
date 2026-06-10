export type PlanId = "basic" | "pro" | "max"

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
    projectLimit: number
    /** null = unlimited syncs for this plan. */
    syncQuota: number | null
    syncQuotaPeriod: "lifetime" | "month" | null
    features: PlanFeatures
    /** Shown on marketing / billing cards. */
    marketingFeatures: string[]
    featured?: boolean
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
        tagline: "Try NoCMS on one project",
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
    pro: {
        id: "pro",
        name: "Pro",
        tagline: "One Notion → Framer pipeline",
        displayOrder: 1,
        projectLimit: 1,
        syncQuota: null,
        syncQuotaPeriod: null,
        features: {
            autoSync: true,
            autoPublish: true,
        },
        marketingFeatures: [
            "1 active project",
            "Unlimited syncs",
            "Auto-sync on content changes",
            "Optional auto-publish to live",
        ],
        rateLimits: {
            framerVerify: { max: 10, windowMs: 60_000 },
            manualSync: { max: 10, windowMs: 60_000 },
            createProject: { max: 3, windowMs: 60_000 },
            setupSession: { max: 20, windowMs: 60_000 },
        },
    },
    max: {
        id: "max",
        name: "Max",
        tagline: "For creators and small teams",
        displayOrder: 2,
        projectLimit: 5,
        syncQuota: null,
        syncQuotaPeriod: null,
        featured: true,
        features: {
            autoSync: true,
            autoPublish: true,
        },
        marketingFeatures: [
            "5 active projects",
            "Everything in Pro",
            "Multiple Framer sites",
        ],
        rateLimits: {
            framerVerify: { max: 10, windowMs: 60_000 },
            manualSync: { max: 15, windowMs: 60_000 },
            createProject: { max: 5, windowMs: 60_000 },
            setupSession: { max: 30, windowMs: 60_000 },
        },
    },
}

export const DEFAULT_PLAN_ID: PlanId = "basic"

const PAID_PLAN_IDS: PlanId[] = ["pro", "max"]

export function isPlanId(value: string): value is PlanId {
    return value in PLANS
}

export function getPlan(planId: string | null | undefined): PlanDefinition {
    if (planId && isPlanId(planId)) {
        return PLANS[planId]
    }
    return PLANS[DEFAULT_PLAN_ID]
}

export function listAllPlans(): PlanDefinition[] {
    return Object.values(PLANS).sort((a, b) => a.displayOrder - b.displayOrder)
}

/** Plans shown on the public checkout / pricing page. */
export function listCheckoutPlans(): PlanDefinition[] {
    return PAID_PLAN_IDS.map(id => PLANS[id])
}

/** Plans that do not require an active Polar subscription. */
export function isFreeAccessPlan(planId: PlanId): boolean {
    return planId === "basic"
}

export function syncRemaining(plan: PlanDefinition, syncCount: number): number | null {
    if (plan.syncQuota === null) return null
    return Math.max(0, plan.syncQuota - syncCount)
}
