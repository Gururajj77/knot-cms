import { apiRequest } from "./client"

export interface AuthMeUsage {
    planId: string
    planName: string
    projectCount: number
    projectLimit: number
    syncCount: number
    syncRemaining: number | null
    features: {
        autoSync: boolean
        autoPublish: boolean
    }
}

export interface PlanCheckoutUrls {
    paid: string | null
}

export interface AuthMe {
    authenticated: boolean
    email?: string
    customerId?: string | null
    entitled?: boolean
    hasPaidSubscription?: boolean
    /** Effective plan for limits and usage UI (lapsed paid → basic). */
    planId?: string
    /** Stored plan_id from billing (used for manage-billing UI). */
    storedPlanId?: string
    subscriptionStatus?: string
    subscriptionCancelAtPeriodEnd?: boolean
    subscriptionEndsAt?: string | null
    checkoutUrl?: string | null
    checkoutUrls?: PlanCheckoutUrls
    billingProvider?: string | null
    checkoutUsesApi?: boolean
    portalUsesApi?: boolean
    seatsUsesApi?: boolean
    subscriptionRenewsAt?: string | null
    pendingCheckoutQuantity?: number | null
    pendingPlanQuantity?: number | null
    pendingPlanReminderAt?: string | null
    planReminderDue?: boolean
    hasPendingCheckout?: boolean
    customerPortalUrl?: string | null
    notionWebhookUrl?: string
    driveWebhookUrl?: string
    usage?: AuthMeUsage | null
}

export function fetchAuthMe(): Promise<AuthMe> {
    return apiRequest<AuthMe>("/api/auth/me")
}

export function logout(): Promise<void> {
    return apiRequest("/auth/google/logout", { method: "POST" }).then(() => undefined)
}
