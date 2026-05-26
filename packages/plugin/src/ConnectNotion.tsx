import { framer } from "framer-plugin"
import { useEffect, useState } from "react"
import { createSetupSession } from "./api"

interface ConnectNotionProps {
    onConnected: (setupSessionId: string) => void
}

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
        <main className="framer-hide-scrollbar setup">
            <div className="intro">
                <div className="logo">
                    <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 100 100" fill="none">
                        <title>Notion</title>
                        <path fill="currentColor" d="M6 6h88v88H6z" opacity="0.15" />
                        <path fill="currentColor" d="M28 22h44l-6 56H34l-6-56z" />
                    </svg>
                </div>
                <div className="content">
                    <h2>Notion Sync</h2>
                    <p>Connect your Notion workspace to publish CMS content to Framer.</p>
                    <p className="hint">Requires the API worker on port 8787 (see README).</p>
                </div>
            </div>

            <button type="button" onClick={handleConnect} disabled={isConnecting}>
                {isConnecting ? <div className="framer-spinner" /> : "Connect Notion"}
            </button>

            {setupSessionId && (
                <p className="hint">Complete authorization in the popup window.</p>
            )}
        </main>
    )
}
