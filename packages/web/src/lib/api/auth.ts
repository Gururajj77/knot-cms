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
    pro: string | null
    max: string | null
}

export interface AuthMe {
    authenticated: boolean
    email?: string
    customerId?: string | null
    entitled?: boolean
    planId?: string
    subscriptionStatus?: string
    subscriptionCancelAtPeriodEnd?: boolean
    subscriptionEndsAt?: string | null
    checkoutUrls?: PlanCheckoutUrls
    customerPortalUrl?: string | null
    usage?: AuthMeUsage | null
}

export function fetchAuthMe(): Promise<AuthMe> {
    return apiRequest<AuthMe>("/api/auth/me")
}

export function logout(): Promise<void> {
    return apiRequest("/auth/google/logout", { method: "POST" }).then(() => undefined)
}
