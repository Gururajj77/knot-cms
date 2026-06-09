export type PlanId = "pro" | "max"

export interface PlanDefinition {
    id: PlanId
    name: string
    tagline: string
    projectLimit: number
    featured?: boolean
    features: string[]
}

/** Checkout URLs per plan — same URL until Polar has separate links. */
export interface PlanCheckoutUrls {
    pro: string | null
    max: string | null
}

export const PLANS: PlanDefinition[] = [
    {
        id: "pro",
        name: "Pro",
        tagline: "One Notion → Framer pipeline",
        projectLimit: 1,
        features: [
            "1 active project",
            "Notion → Framer CMS sync",
            "Auto-sync on content changes",
            "Optional auto-publish to live",
        ],
    },
    {
        id: "max",
        name: "Max",
        tagline: "For creators and small teams",
        projectLimit: 5,
        featured: true,
        features: [
            "5 active projects",
            "Everything in Pro",
            "Multiple Framer sites",
            "More data sources soon",
        ],
    },
]

export function checkoutUrlForPlan(urls: PlanCheckoutUrls, planId: PlanId): string | null {
    return urls[planId] ?? urls.pro ?? urls.max
}

export function resolvePlanCheckoutUrls(checkoutUrl: string | null | undefined): PlanCheckoutUrls {
    const url = checkoutUrl?.trim() || null
    return { pro: url, max: url }
}
