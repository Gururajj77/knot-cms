import type { ProjectStatus } from "@nocms/shared"

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

export function webhookEndpointUrl(): string {
    if (typeof window !== "undefined") {
        return `${window.location.origin}/webhooks/notion`
    }
    return "/webhooks/notion"
}
