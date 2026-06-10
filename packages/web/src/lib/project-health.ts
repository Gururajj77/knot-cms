import type { ProjectStatus } from "@nocms/shared"

export type HealthTone = "ok" | "warn" | "err" | "neutral"

export function projectHealthTone(status: ProjectStatus): HealthTone {
    if (status.lastError) return "err"
    if (status.autoSync && status.webhookStatus !== "active") return "warn"
    return "ok"
}

export function projectHealthLabel(status: ProjectStatus): string {
    if (status.lastError) return "Error"
    if (status.autoSync && status.webhookStatus !== "active") return "Webhook pending"
    return "Healthy"
}
