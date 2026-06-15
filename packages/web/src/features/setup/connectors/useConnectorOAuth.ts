import { useEffect, useRef, useState } from "react"
import { createDashboardSetupSession } from "../../../lib/api"
import { SETUP_SESSION_KEY } from "../constants"
import { getConnector, getConnectorByOAuthEvent } from "./registry"
import type { ConnectorId, ConnectorOAuthSession } from "./types"

type SetupSessionConnectorId = "notion" | "google_sheets"

function setupSessionConnectorId(connectorId: ConnectorId): SetupSessionConnectorId {
    return connectorId === "google_sheets" ? "google_sheets" : "notion"
}

interface UseConnectorOAuthOptions {
    onComplete: (setupSessionId: string, connectorId: ConnectorId) => void
}

export function useConnectorOAuth({ onComplete }: UseConnectorOAuthOptions) {
    const [busy, setBusy] = useState(false)
    const [awaitingConnectorId, setAwaitingConnectorId] = useState<ConnectorId | null>(null)
    const [error, setError] = useState<string | null>(null)

    const pendingOAuthRef = useRef<(ConnectorOAuthSession & { connectorId: ConnectorId }) | null>(null)
    const popupPollRef = useRef<ReturnType<typeof setInterval> | null>(null)

    useEffect(() => {
        const handler = (event: MessageEvent) => {
            const connector = getConnectorByOAuthEvent(event.data?.type)
            if (!connector || !event.data?.setupSessionId) return

            const sessionId = event.data.setupSessionId as string
            sessionStorage.setItem(SETUP_SESSION_KEY, sessionId)
            pendingOAuthRef.current = null
            setAwaitingConnectorId(null)
            setBusy(false)
            onComplete(sessionId, connector.definition.id)
        }

        window.addEventListener("message", handler)
        return () => {
            window.removeEventListener("message", handler)
            if (popupPollRef.current) clearInterval(popupPollRef.current)
        }
    }, [onComplete])

    const watchPopup = (popup: Window) => {
        if (popupPollRef.current) clearInterval(popupPollRef.current)
        popupPollRef.current = setInterval(() => {
            if (popup.closed) {
                if (popupPollRef.current) clearInterval(popupPollRef.current)
                popupPollRef.current = null
                setAwaitingConnectorId(null)
                setBusy(false)
            }
        }, 500)
    }

    const ensureSession = async (connectorId: ConnectorId): Promise<ConnectorOAuthSession | { credentialWarning: string }> => {
        if (pendingOAuthRef.current?.connectorId === connectorId) {
            return {
                setupSessionId: pendingOAuthRef.current.setupSessionId,
                oauthUrl: pendingOAuthRef.current.oauthUrl,
            }
        }

        const session = await createDashboardSetupSession(setupSessionConnectorId(connectorId))
        if (session.credentialWarning) {
            return { credentialWarning: session.credentialWarning }
        }

        pendingOAuthRef.current = {
            connectorId,
            setupSessionId: session.setupSessionId,
            oauthUrl: session.oauthUrl,
        }
        return {
            setupSessionId: session.setupSessionId,
            oauthUrl: session.oauthUrl,
        }
    }

    const connectPopup = (connectorId: ConnectorId) => {
        const connector = getConnector(connectorId)
        setError(null)

        const popup = window.open("about:blank", connector.oauthPopupName, "popup,width=560,height=760")
        if (!popup) {
            setError("Popup blocked. Allow popups for this site, or use “Continue in this tab” below.")
            return
        }

        setBusy(true)
        setAwaitingConnectorId(connectorId)
        watchPopup(popup)

        void (async () => {
            try {
                const session = await ensureSession(connectorId)
                if ("credentialWarning" in session) {
                    popup.close()
                    setAwaitingConnectorId(null)
                    setError(session.credentialWarning)
                    return
                }
                if (popup.closed) return
                popup.location.replace(session.oauthUrl)
            } catch (err) {
                popup.close()
                setAwaitingConnectorId(null)
                setError(err instanceof Error ? err.message : `Could not start ${connector.definition.name} authorization`)
            } finally {
                setBusy(false)
            }
        })()
    }

    const connectInTab = async (connectorId: ConnectorId, returnTo: string) => {
        const connector = getConnector(connectorId)
        setBusy(true)
        setError(null)

        try {
            const session = await ensureSession(connectorId)
            if ("credentialWarning" in session) {
                setError(session.credentialWarning)
                return
            }

            window.location.href = connector.oauthStartPath(session.setupSessionId, returnTo)
        } catch (err) {
            setError(err instanceof Error ? err.message : `Could not start ${connector.definition.name} authorization`)
            setBusy(false)
        }
    }

    return {
        busy,
        awaitingConnectorId,
        error,
        setError,
        connectPopup,
        connectInTab,
    }
}
