import type { ProjectStatus } from "@notion-framer/shared"

export type OverallHealth = "healthy" | "warning" | "error" | "idle"

export function formatRelativeTime(iso: string | null): string {
    if (!iso) return "Never"
    const then = new Date(iso).getTime()
    if (Number.isNaN(then)) return "Unknown"

    const diffSec = Math.round((Date.now() - then) / 1000)
    if (diffSec < 60) return "Just now"
    if (diffSec < 3600) {
        const m = Math.floor(diffSec / 60)
        return `${m}m ago`
    }
    if (diffSec < 86400) {
        const h = Math.floor(diffSec / 3600)
        return `${h}h ago`
    }
    const d = Math.floor(diffSec / 86400)
    return `${d}d ago`
}

export function truncateLabel(text: string, max = 28): string {
    if (text.length <= max) return text
    return `${text.slice(0, max - 1)}…`
}

export function webhookLabel(status: string | null, autoSync: boolean): string {
    if (!autoSync) return "Off"
    if (status === "active") return "Ready"
    if (status === "awaiting_verification") return "Verify in Notion"
    return "Setup needed"
}

export function publishLabel(status: ProjectStatus): string {
    if (!status.autoPublish) return "Off"
    return status.publishMode === "deploy_live" ? "Live" : "Preview"
}

export function getHeroHeadline(status: ProjectStatus): string {
    const n = status.itemsSyncedCount
    if (status.lastError) return "Sync failed"
    if (status.licenseStatus !== "active") return "License inactive"
    if (!status.lastSyncAt) return "Ready to sync"
    return `${n} item${n === 1 ? "" : "s"} in Framer`
}

export function getHeroMeta(status: ProjectStatus, collectionName: string): string {
    if (status.lastError) return status.lastError
    if (status.licenseStatus !== "active") return "Reconfigure to enter a valid license"
    const when = formatRelativeTime(status.lastSyncAt)
    if (!status.lastSyncAt) return `Tap Sync now → “${truncateLabel(collectionName, 24)}”`
    const webhook = webhookLabel(status.webhookStatus, status.autoSync)
    if (status.autoSync && webhook !== "Ready") {
        return `Last sync ${when} · webhook ${webhook.toLowerCase()}`
    }
    return `Last sync ${when} · ${truncateLabel(collectionName, 32)}`
}

export function getOverallHealth(status: ProjectStatus): OverallHealth {
    if (status.lastError || status.licenseStatus !== "active") return "error"
    if (!status.lastSyncAt) return "idle"
    const wh = webhookLabel(status.webhookStatus, status.autoSync)
    if (status.autoSync && wh !== "Ready" && wh !== "Off") return "warning"
    return "healthy"
}
