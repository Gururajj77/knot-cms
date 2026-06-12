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

const WEBHOOK_PATH = "/webhooks/notion"

/** Prefer server-provided canonical webhook URL; fall back to current origin in dev. */
export function webhookEndpointUrl(canonicalWebhookUrl?: string | null): string {
    const fromServer = canonicalWebhookUrl?.trim().replace(/\/$/, "")
    if (fromServer) {
        if (fromServer.endsWith(WEBHOOK_PATH)) return fromServer
        return `${fromServer}${WEBHOOK_PATH}`
    }

    const origin =
        typeof window !== "undefined" ? window.location.origin.replace(/\/$/, "") : ""
    if (!origin) return WEBHOOK_PATH
    return `${origin}${WEBHOOK_PATH}`
}
