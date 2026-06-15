import type { ProjectStatus } from "@knotcms/shared"
import { Check, Copy, RefreshCw } from "lucide-react"
import { useState } from "react"
import { useAuthContext } from "../../app/AuthContext"
import { confirmDashboardWebhook } from "../../lib/api"
import { Banner, Button, useToast } from "../../components/ui"
import { driveWebhookEndpointUrl, isHttpsWebhookUrl, needsWebhookSetup, webhookEndpointUrl } from "../../lib/webhook"

interface WebhookSetupCardProps {
    status: ProjectStatus
    projectId: string
    onUpdated: (status: ProjectStatus) => void
    onRefresh: () => Promise<void>
    /** Nest inside Sync behavior panel instead of a standalone card. */
    embedded?: boolean
}

export function WebhookSetupCard({
    status,
    projectId,
    onUpdated,
    onRefresh,
    embedded = false,
}: WebhookSetupCardProps) {
    const { auth } = useAuthContext()
    const { toast } = useToast()
    const [confirming, setConfirming] = useState(false)
    const [refreshing, setRefreshing] = useState(false)

    if (!needsWebhookSetup(status)) return null

    if (status.sourceProvider === "google_sheets") {
        const expired = status.webhookStatus === "expired"
        const pending = status.webhookStatus !== "active"
        const driveWebhookUrl = driveWebhookEndpointUrl(auth?.driveWebhookUrl)
        const httpsReady = isHttpsWebhookUrl(driveWebhookUrl)

        return (
            <div className={embedded ? "pf-project-settings-nested" : "pf-setup-section pf-setup-section--accent"}>
                <div className={embedded ? "pf-project-settings-nested-head" : "pf-setup-section-head"}>
                    <h3 className={embedded ? "pf-project-settings-nested-title" : "pf-setup-section-title"}>
                        Google Sheets auto-sync
                    </h3>
                    <p className={embedded ? "pf-project-settings-nested-desc" : "pf-setup-section-desc"}>
                        {expired
                            ? "Your Drive watch expired after 7+ days without edits. Use Sync now or edit the sheet to turn auto-sync back on."
                            : "KnotCMS watches your spreadsheet for changes. Keep editing at least once every 7 days, or use Sync now to re-arm the watch."}
                    </p>
                </div>

                {pending && !httpsReady ? (
                    <Banner tone="warning" className="pf-banner--inset">
                        Google Drive webhooks require <strong>HTTPS</strong>. For local dev, set a stable
                        tunnel hostname in <code>packages/worker/.dev.vars</code> (see{" "}
                        <code>docs/NAMED_TUNNEL.md</code>):
                        <div className="pf-token-box pf-token-box--spaced">
                            <code className="pf-token-text">
                                WEBHOOK_PUBLIC_URL=https://dev-api.yourdomain.com
                            </code>
                        </div>
                        Run <code>npm run tunnel</code>, restart the worker, then click{" "}
                        <strong>Sync now</strong> on this project.
                    </Banner>
                ) : pending ? (
                    <Banner tone="info" className="pf-banner--inset">
                        Drive watch endpoint: <code>{driveWebhookUrl}</code>. Click <strong>Sync now</strong> to
                        register the watch.
                    </Banner>
                ) : null}
            </div>
        )
    }

    const webhookUrl = webhookEndpointUrl(auth?.notionWebhookUrl)
    const hasToken = Boolean(status.webhookVerificationToken)

    const copy = async (value: string, label: string) => {
        try {
            await navigator.clipboard.writeText(value)
            toast(`${label} copied`, "success")
        } catch {
            toast("Could not copy to clipboard", "error")
        }
    }

    const handleRefresh = async () => {
        setRefreshing(true)
        try {
            await onRefresh()
        } catch {
            toast("Could not refresh webhook status", "error")
        } finally {
            setRefreshing(false)
        }
    }

    const handleConfirm = async () => {
        setConfirming(true)
        try {
            const updated = await confirmDashboardWebhook(projectId)
            onUpdated(updated)
            toast("Webhook marked active", "success")
        } catch (err) {
            const message = err instanceof Error ? err.message : "Could not confirm webhook"
            toast(message, "error")
        } finally {
            setConfirming(false)
        }
    }

    return (
        <div
            className={
                embedded
                    ? "pf-project-settings-nested"
                    : "pf-setup-section pf-setup-section--accent"
            }
        >
            <div className={embedded ? "pf-project-settings-nested-head" : "pf-setup-section-head"}>
                <h3 className={embedded ? "pf-project-settings-nested-title" : "pf-setup-section-title"}>
                    Notion webhook setup
                </h3>
                <p className={embedded ? "pf-project-settings-nested-desc" : "pf-setup-section-desc"}>
                    Required for auto-sync — add a subscription in Notion pointing at KnotCMS.
                </p>
            </div>

            <ol className="pf-webhook-steps">
                <li>
                    Open <strong>Notion → Settings → Integrations → your integration → Webhooks</strong>.
                </li>
                <li>
                    Add a subscription with this URL:
                    <div className="pf-token-box">
                        <code className="pf-token-text">{webhookUrl}</code>
                        <Button variant="secondary" onClick={() => void copy(webhookUrl, "Webhook URL")}>
                            <Copy size={14} aria-hidden />
                            Copy
                        </Button>
                    </div>
                </li>
                <li>
                    Paste the verification token below into Notion → <strong>Verify subscription</strong>.
                </li>
                <li>
                    When verification is done in Notion, click <strong>I've verified in Notion</strong> below.
                </li>
            </ol>

            {hasToken ? (
                <div className="pf-webhook-token">
                    <p className="pf-eyebrow">Verification token</p>
                    <div className="pf-token-box">
                        <code className="pf-token-text">{status.webhookVerificationToken}</code>
                        <Button
                            variant="secondary"
                            onClick={() =>
                                void copy(status.webhookVerificationToken!, "Verification token")
                            }
                        >
                            <Copy size={14} aria-hidden />
                            Copy
                        </Button>
                    </div>
                </div>
            ) : (
                <Banner tone="info" className="pf-banner--inset">
                    After you add the webhook URL in Notion, click Refresh token to load the verification
                    token here.
                </Banner>
            )}

            <div className={`pf-card-footer${embedded ? " pf-card-footer--wrap" : ""}`}>
                <Button variant="secondary" onClick={() => void handleRefresh()} disabled={refreshing}>
                    <RefreshCw
                        size={15}
                        strokeWidth={2}
                        className={refreshing ? "pf-spin-icon" : undefined}
                        aria-hidden
                    />
                    {refreshing ? "Refreshing…" : "Refresh token"}
                </Button>
                <Button onClick={() => void handleConfirm()} disabled={confirming}>
                    <Check size={15} aria-hidden />
                    {confirming ? "Updating…" : "I've verified in Notion"}
                </Button>
            </div>
        </div>
    )
}
