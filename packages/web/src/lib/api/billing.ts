import { apiRequest } from "./client"

export interface BillingCheckoutResponse {
    url: string
    sessionId?: string | null
}

export function createBillingCheckout(quantity: number): Promise<BillingCheckoutResponse> {
    return apiRequest<BillingCheckoutResponse>("/api/billing/checkout", {
        method: "POST",
        body: JSON.stringify({ quantity }),
    })
}

export function fetchBillingPortal(): Promise<{ url: string }> {
    return apiRequest<{ url: string }>("/api/billing/portal")
}

export interface BillingPublicConfig {
    provider: string | null
    merchantLabel: string
    checkoutUsesApi: boolean
    portalUsesApi: boolean
    seatsUsesApi: boolean
}

export interface RestartBillingWithSeatsResponse {
    url?: string
    sessionId?: string | null
    message: string
    deferred?: boolean
    reminderAt?: string
    quantity?: number
    pendingCheckout?: boolean
}

export function restartBillingWithSeats(
    quantity: number,
    timing: "now" | "before_renewal" = "now"
): Promise<RestartBillingWithSeatsResponse> {
    return apiRequest<RestartBillingWithSeatsResponse>("/api/billing/restart-with-seats", {
        method: "POST",
        body: JSON.stringify({ quantity, timing }),
    })
}

export function completePendingCheckout(
    quantity: number
): Promise<{ url: string; sessionId?: string | null; message: string }> {
    return apiRequest<{ url: string; sessionId?: string | null; message: string }>(
        "/api/billing/pending-checkout",
        {
            method: "POST",
            body: JSON.stringify({ quantity }),
        }
    )
}

function fetchBillingConfig(): Promise<BillingPublicConfig> {
    return apiRequest<BillingPublicConfig>("/api/billing/config")
}
