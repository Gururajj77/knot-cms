import { apiRequest } from "./client"

export interface AuthMe {
    authenticated: boolean
    email?: string
    customerId?: string | null
    entitled?: boolean
    checkoutUrl?: string | null
}

export function fetchAuthMe(): Promise<AuthMe> {
    return apiRequest<AuthMe>("/api/auth/me")
}

export function logout(): Promise<void> {
    return apiRequest("/auth/google/logout", { method: "POST" }).then(() => undefined)
}
