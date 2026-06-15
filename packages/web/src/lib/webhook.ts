import type { ProjectStatus } from "@knotcms/shared"

export function webhookStatusLabel(
    status: string | null,
    autoSync: boolean,
    hasVerificationToken?: boolean,
    sourceProvider: ProjectStatus["sourceProvider"] = "notion"
): string {
    if (!autoSync) return "Off"
    if (status === "active") {
        return sourceProvider === "google_sheets" ? "Auto-sync active" : "Active"
    }
    if (sourceProvider === "google_sheets") {
        if (status === "expired") return "Paused — sync or edit to resume"
        return "Setting up watch"
    }
    if (status === "awaiting_verification") {
        return hasVerificationToken ? "Verified — awaiting first event" : "Awaiting verification"
    }
    if (status === "pending") return "Setup required"
    return status ?? "—"
}

export function needsWebhookSetup(status: ProjectStatus): boolean {
    if (!status.autoSync) return false
    if (status.sourceProvider === "google_sheets") {
        return status.webhookStatus !== "active"
    }
    return status.webhookStatus !== "active"
}

const NOTION_WEBHOOK_PATH = "/webhooks/notion"
const DRIVE_WEBHOOK_PATH = "/webhooks/google-drive"

/** Prefer server-provided canonical webhook URL; fall back to current origin in dev. */
export function webhookEndpointUrl(canonicalWebhookUrl?: string | null): string {
    const fromServer = canonicalWebhookUrl?.trim().replace(/\/$/, "")
    if (fromServer) {
        if (fromServer.endsWith(NOTION_WEBHOOK_PATH)) return fromServer
        return `${fromServer}${NOTION_WEBHOOK_PATH}`
    }

    const origin =
        typeof window !== "undefined" ? window.location.origin.replace(/\/$/, "") : ""
    if (!origin) return NOTION_WEBHOOK_PATH
    return `${origin}${NOTION_WEBHOOK_PATH}`
}

export function driveWebhookEndpointUrl(canonicalWebhookUrl?: string | null): string {
    const fromServer = canonicalWebhookUrl?.trim().replace(/\/$/, "")
    if (fromServer) {
        if (fromServer.endsWith(DRIVE_WEBHOOK_PATH)) return fromServer
        return `${fromServer}${DRIVE_WEBHOOK_PATH}`
    }

    const origin =
        typeof window !== "undefined" ? window.location.origin.replace(/\/$/, "") : ""
    if (!origin) return DRIVE_WEBHOOK_PATH
    return `${origin}${DRIVE_WEBHOOK_PATH}`
}

export function isHttpsWebhookUrl(url: string): boolean {
    return url.startsWith("https://")
}
