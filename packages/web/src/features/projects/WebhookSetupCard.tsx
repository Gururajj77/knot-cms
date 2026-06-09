import type { ProjectStatus } from "@notion-framer/shared"
import { useState } from "react"
import { needsWebhookSetup, webhookEndpointUrl } from "../../lib/webhook"
import { Banner, Button, Card, CardHeader } from "../../components/ui"

interface WebhookSetupCardProps {
    status: ProjectStatus
}

export function WebhookSetupCard({ status }: WebhookSetupCardProps) {
    const [copied, setCopied] = useState<"url" | "token" | null>(null)
    const webhookUrl = webhookEndpointUrl()
    if (!needsWebhookSetup(status)) return null

    const copy = async (value: string, kind: "url" | "token") => {
        try {
            await navigator.clipboard.writeText(value)
            setCopied(kind)
            window.setTimeout(() => setCopied(current => (current === kind ? null : current)), 2000)
        } catch {
            setCopied(null)
        }
    }

    return (
        <Card>
            <CardHeader
                title="Webhook verification"
                description="Auto-sync needs a Notion webhook pointing at your PublishFlow worker. Complete these steps once per Notion integration."
            />

            <ol className="pf-webhook-steps">
                <li>
                    Open <strong>Notion → Settings → Integrations → your integration → Webhooks</strong>.
                </li>
                <li>
                    Add a subscription with this URL:
                    <div className="pf-token-box">
                        <code className="pf-token-text">{webhookUrl}</code>
                        <Button variant="secondary" onClick={() => void copy(webhookUrl, "url")}>
                            {copied === "url" ? "Copied" : "Copy URL"}
                        </Button>
                    </div>
                </li>
                <li>
                    After Notion sends a verification request, copy the token below and paste it in Notion →{" "}
                    <strong>Verify subscription</strong>.
                </li>
            </ol>

            {status.webhookVerificationToken ? (
                <div className="pf-webhook-token">
                    <p className="pf-eyebrow">Verification token</p>
                    <div className="pf-token-box">
                        <code className="pf-token-text">{status.webhookVerificationToken}</code>
                        <Button
                            variant="secondary"
                            onClick={() => void copy(status.webhookVerificationToken!, "token")}
                        >
                            {copied === "token" ? "Copied" : "Copy token"}
                        </Button>
                    </div>
                </div>
            ) : (
                <Banner tone="info" className="pf-banner--inset">
                    Waiting for Notion to send a verification token. Save the webhook subscription in Notion —
                    this page will update automatically.
                </Banner>
            )}
        </Card>
    )
}
