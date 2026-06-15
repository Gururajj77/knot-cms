import type { ProjectStatus } from "@knotcms/shared"
import { displaySyncError } from "@knotcms/shared"
import { projectHealthTone, type HealthTone } from "./project-health"
import { projectSourcePlugin } from "./source-provider"
import { needsWebhookSetup, webhookStatusLabel } from "./webhook"

export interface ProjectStatusSummary {
    tone: HealthTone
    title: string
    detail: string
}

export function projectStatusSummary(status: ProjectStatus): ProjectStatusSummary {
    const tone = projectHealthTone(status)
    const plugin = projectSourcePlugin(status)
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
            Boolean(status.webhookVerificationToken),
            status.sourceProvider
        )
        const setupHint =
            status.sourceProvider === "google_sheets"
                ? `Finish setup below so changes in your ${plugin.sourceItemLabel.toLowerCase()} reach Framer.`
                : `Finish setup below so changes in ${plugin.changesLabel} reach Framer.`
        return {
            tone: "warn",
            title:
                status.sourceProvider === "google_sheets"
                    ? "Auto-sync setup required"
                    : "Webhook setup required",
            detail: `Auto-sync is on but ${status.sourceProvider === "google_sheets" ? "the Drive watch is" : "the Notion webhook is"} not active yet (${webhookLabel.toLowerCase()}). ${setupHint}`,
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
        detail: `${plugin.changesLabel} changes flow to your Framer CMS collection automatically.${publishNote}`,
    }
}

export function truncateMiddle(value: string, max = 42): string {
    if (value.length <= max) return value
    const head = Math.ceil((max - 1) / 2)
    const tail = Math.floor((max - 1) / 2)
    return `${value.slice(0, head)}…${value.slice(-tail)}`
}
