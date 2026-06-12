import type { ProjectStatus } from "@knotcms/shared"
import { Check, Copy } from "lucide-react"
import { useState } from "react"
import { useAuthContext } from "../../app/AuthContext"
import { confirmDashboardWebhook } from "../../lib/api"
import { Banner, Button, useToast } from "../../components/ui"
import { needsWebhookSetup, webhookEndpointUrl } from "../../lib/webhook"

interface WebhookSetupCardProps {
    status: ProjectStatus
    projectId: string
    onUpdated: (status: ProjectStatus) => void
}

export function WebhookSetupCard({ status, projectId, onUpdated }: WebhookSetupCardProps) {
    const { auth } = useAuthContext()
    const { toast } = useToast()
    const [confirming, setConfirming] = useState(false)
    const webhookUrl = webhookEndpointUrl(auth?.notionWebhookUrl)
    if (!needsWebhookSetup(status)) return null

    const hasToken = Boolean(status.webhookVerificationToken)

    const copy = async (value: string, label: string) => {
        try {
            await navigator.clipboard.writeText(value)
            toast(`${label} copied`, "success")
        } catch {
            toast("Could not copy to clipboard", "error")
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
        <section className="pf-setup-section pf-setup-section--accent">
            <div className="pf-setup-section-head">
                <h3 className="pf-setup-section-title">Webhook verification</h3>
                <p className="pf-setup-section-desc">
                    Add a Notion webhook subscription pointing at your KnotCMS app.
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
            </ol>

            {hasToken ? (
                <>
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
                    <div className="pf-card-footer">
                        <Button onClick={() => void handleConfirm()} disabled={confirming}>
                            <Check size={15} aria-hidden />
                            {confirming ? "Updating…" : "I've verified in Notion"}
                        </Button>
                    </div>
                </>
            ) : (
                <Banner tone="info" className="pf-banner--inset">
                    Waiting for Notion to send a verification token. This page updates automatically.
                </Banner>
            )}
        </section>
    )
}
