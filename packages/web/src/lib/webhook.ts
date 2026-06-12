import type { ProjectStatus } from "@knotcms/shared"

export function webhookStatusLabel(
    status: string | null,
    autoSync: boolean,
    hasVerificationToken?: boolean
): string {
    if (!autoSync) return "Off"
    if (status === "active") return "Active"
    if (status === "awaiting_verification") {
        return hasVerificationToken ? "Verified — awaiting first event" : "Awaiting verification"
    }
    if (status === "pending") return "Setup required"
    return status ?? "—"
}

export function needsWebhookSetup(status: ProjectStatus): boolean {
    return status.autoSync && status.webhookStatus !== "active"
}

/** Prefer server-provided canonical URL (app.knotcms.com); fall back to current origin in dev. */
export function webhookEndpointUrl(canonicalOrigin?: string | null): string {
    const origin =
        canonicalOrigin?.replace(/\/$/, "") ||
        (typeof window !== "undefined" ? window.location.origin : "")
    if (!origin) return "/webhooks/notion"
    return `${origin}/webhooks/notion`
}
