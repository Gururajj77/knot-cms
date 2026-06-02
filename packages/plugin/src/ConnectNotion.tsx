import { framer } from "framer-plugin"
import { useEffect, useState } from "react"
import { createSetupSession } from "./api"
import { WizardShell } from "./WizardShell"

interface ConnectNotionProps {
    onConnected: (setupSessionId: string) => void
}

const FEATURES = [
    ["Notion → Framer", "Your database fields map directly to CMS fields"],
    ["Server-side sync", "Runs on a worker — no browser tab required"],
    ["Auto publish", "New entries go live when you save in Notion"],
] as const

export function ConnectNotion({ onConnected }: ConnectNotionProps) {
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
            window.open(oauthUrl, "_blank", "width=520,height=720")
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
            <div className="nf-page nf-page--center">
                <div className="nf-page-body">
                    <div className="nf-section">
                        <p className="nf-eyebrow">NF Sync</p>
                        <h1 className="nf-hero-title">
                            Write in Notion.
                            <br />
                            Publish in Framer.
                        </h1>
                        <p className="nf-desc">
                            Connect your Notion database as the source of truth. NF Sync keeps your Framer CMS up to
                            date automatically.
                        </p>
                    </div>

                    <div className="nf-section">
                        <button type="button" className="nf-btn nf-btn--primary" onClick={handleConnect} disabled={isConnecting}>
                            {isConnecting ? <div className="framer-spinner" /> : "Connect Notion"}
                        </button>
                        <p className="nf-caption">Takes about 3 minutes to set up</p>
                        {setupSessionId && (
                            <p className="nf-caption">Complete authorization in the popup window.</p>
                        )}
                    </div>

                    <div className="nf-features">
                        {FEATURES.map(([title, desc]) => (
                            <div key={title} className="nf-feature">
                                <div className="nf-feature-icon" aria-hidden>
                                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                                        <path
                                            d="M1.5 4L3.5 6L6.5 2"
                                            stroke="currentColor"
                                            strokeWidth="1.5"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                </div>
                                <div>
                                    <p className="nf-feature-title">{title}</p>
                                    <p className="nf-feature-desc">{desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </WizardShell>
    )
}
