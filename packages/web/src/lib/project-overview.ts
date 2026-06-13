import type { ProjectStatus } from "@knotcms/shared"
import { displaySyncError } from "@knotcms/shared"
import { projectHealthTone, type HealthTone } from "./project-health"
import { needsWebhookSetup, webhookStatusLabel } from "./webhook"

export interface ProjectStatusSummary {
    tone: HealthTone
    title: string
    detail: string
}

export function projectStatusSummary(status: ProjectStatus): ProjectStatusSummary {
    const tone = projectHealthTone(status)
    const syncError = displaySyncError(status)

    if (syncError) {
        return {
            tone: "err",
            title: "Sync failed on last run",
            detail: syncError,
        }
    }

    if (needsWebhookSetup(status)) {
        const webhookLabel = webhookStatusLabel(
            status.webhookStatus,
            status.autoSync,
            Boolean(status.webhookVerificationToken)
        )
        return {
            tone: "warn",
            title: "Webhook setup required",
            detail: `Auto-sync is on but the Notion webhook is not active yet (${webhookLabel.toLowerCase()}). Finish setup below so changes in Notion reach Framer.`,
        }
    }

    if (!status.autoSync) {
        return {
            tone: "neutral",
            title: "Manual sync only",
            detail: "This connection is idle until you click Sync now or turn on auto-sync.",
        }
    }

    const publishNote = status.autoPublish
        ? status.publishMode === "deploy_live"
            ? " Framer deploys to your live site after each sync."
            : " Framer opens a preview after each sync."
        : ""

    return {
        tone: "ok",
        title: "Sync pipeline active",
        detail: `Notion changes flow to your Framer CMS collection automatically.${publishNote}`,
    }
}

export function truncateMiddle(value: string, max = 42): string {
    if (value.length <= max) return value
    const head = Math.ceil((max - 1) / 2)
    const tail = Math.floor((max - 1) / 2)
    return `${value.slice(0, head)}…${value.slice(-tail)}`
}
