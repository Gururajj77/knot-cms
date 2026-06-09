import type { ProjectStatus } from "@notion-framer/shared"
import { Copy } from "lucide-react"
import { Banner, Button, Card, CardHeader, useToast } from "../../components/ui"
import { needsWebhookSetup, webhookEndpointUrl } from "../../lib/webhook"

interface WebhookSetupCardProps {
    status: ProjectStatus
}

export function WebhookSetupCard({ status }: WebhookSetupCardProps) {
    const { toast } = useToast()
    const webhookUrl = webhookEndpointUrl()
    if (!needsWebhookSetup(status)) return null

    const copy = async (value: string, label: string) => {
        try {
            await navigator.clipboard.writeText(value)
            toast(`${label} copied`, "success")
        } catch {
            toast("Could not copy to clipboard", "error")
        }
    }

    return (
        <Card>
            <CardHeader
                title="Webhook verification"
                description="Add a Notion webhook subscription pointing at your PublishFlow worker."
            />

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

            {status.webhookVerificationToken ? (
                <div className="pf-webhook-token">
                    <p className="pf-eyebrow">Verification token</p>
                    <div className="pf-token-box">
                        <code className="pf-token-text">{status.webhookVerificationToken}</code>
                        <Button
                            variant="secondary"
                            onClick={() => void copy(status.webhookVerificationToken!, "Verification token")}
                        >
                            <Copy size={14} aria-hidden />
                            Copy
                        </Button>
                    </div>
                </div>
            ) : (
                <Banner tone="info" className="pf-banner--inset">
                    Waiting for Notion to send a verification token. This page updates automatically.
                </Banner>
            )}
        </Card>
    )
}
