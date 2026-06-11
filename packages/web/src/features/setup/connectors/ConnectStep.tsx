import { Link } from "react-router-dom"
import { ROUTES } from "../../../constants/routes"
import { Banner, buttonClass } from "../../../components/ui"
import { ConnectorCard } from "./ConnectorCard"
import { CONNECTOR_DEFINITIONS, getConnector } from "./registry"
import type { ConnectorId } from "./types"

interface ConnectStepProps {
    busy: boolean
    awaitingConnectorId: ConnectorId | null
    infoMessage?: string | null
    connectorIds?: ConnectorId[]
    hideFooter?: boolean
    onConnect: (connectorId: ConnectorId) => void
    onConnectInTab: (connectorId: ConnectorId) => void
}

export function ConnectStep({
    busy,
    awaitingConnectorId,
    infoMessage,
    connectorIds,
    hideFooter = false,
    onConnect,
    onConnectInTab,
}: ConnectStepProps) {
    const connectors = connectorIds
        ? connectorIds.map(id => getConnector(id).definition)
        : CONNECTOR_DEFINITIONS

    return (
        <div className={hideFooter ? "pf-connect-embed" : "pf-setup-step"}>
            {!hideFooter ? (
                <header className="pf-setup-step-header">
                    <p className="pf-eyebrow">Step 1 · Source</p>
                    <h2 className="pf-setup-step-title">Where does your content live?</h2>
                    <p className="pf-setup-step-desc">
                        Pick where you write and manage content. KnotCMS keeps it synced to Framer CMS.
                    </p>
                </header>
            ) : null}

            {infoMessage ? <Banner tone="info">{infoMessage}</Banner> : null}

            <div className="pf-connector-list">
                {connectors.map(connector => (
                    <ConnectorCard
                        key={connector.id}
                        connector={connector}
                        busy={busy}
                        awaiting={awaitingConnectorId === connector.id}
                        onConnect={onConnect}
                        onConnectInTab={onConnectInTab}
                    />
                ))}
            </div>

            {!hideFooter ? (
                <footer className="pf-setup-footer">
                    <Link className={buttonClass("ghost")} to={ROUTES.home}>
                        Cancel
                    </Link>
                </footer>
            ) : null}
        </div>
    )
}
