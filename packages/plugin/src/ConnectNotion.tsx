import { framer } from "framer-plugin"
import { useEffect, useState } from "react"
import { createSetupSession } from "./api"
import { StepBack, StepHeader, WizardShell } from "./WizardShell"

interface ConnectNotionProps {
    onBack: () => void
    onConnected: (setupSessionId: string) => void
}

export function ConnectNotion({ onBack, onConnected }: ConnectNotionProps) {
    const [isConnecting, setIsConnecting] = useState(false)
    const [setupSessionId, setSetupSessionId] = useState<string | null>(null)

    useEffect(() => {
        const handler = (event: MessageEvent) => {
            if (event.data?.type === "notion-oauth-complete" && event.data.setupSessionId) {
                onConnected(event.data.setupSessionId)
            }
        }
        window.addEventListener("message", handler)
        return () => window.removeEventListener("message", handler)
    }, [onConnected])

    const handleConnect = async () => {
        try {
            setIsConnecting(true)
            const { setupSessionId: sessionId, oauthUrl } = await createSetupSession()
            setSetupSessionId(sessionId)
            window.open(oauthUrl, "_blank", "width=560,height=760")
        } catch (error) {
            console.error(error)
            const msg =
                error instanceof TypeError && error.message.includes("fetch")
                    ? "Backend not running. In a terminal: cd notion-framer-sync && npm run dev:worker"
                    : error instanceof Error
                      ? error.message
                      : "Failed to start Notion connection."
            framer.notify(msg, { variant: "error", durationMs: 8000 })
        } finally {
            setIsConnecting(false)
        }
    }

    return (
        <WizardShell setupStep={1}>
            <div className="nf-page">
                <div className="nf-page-body">
                    <StepBack onClick={onBack}>Back</StepBack>
                    <StepHeader
                        title="Connect Notion"
                        description="Authorize PublishFlow to read your Notion workspaces and databases."
                    />

                    <div className="nf-section">
                        <button
                            type="button"
                            className="nf-btn nf-btn--primary"
                            onClick={handleConnect}
                            disabled={isConnecting}
                        >
                            {isConnecting ? <div className="framer-spinner" /> : "Continue with Notion"}
                        </button>
                        <p className="nf-caption">
                            {setupSessionId
                                ? "Complete authorization in the popup window"
                                : "Opens Notion in a new window — you can revoke access anytime"}
                        </p>
                    </div>
                </div>
            </div>
        </WizardShell>
    )
}
