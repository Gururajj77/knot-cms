import { Link } from "react-router-dom"
import { ROUTES } from "../../../constants/routes"
import { Banner, Card, CardHeader, buttonClass } from "../../../components/ui"
import { ConnectorCard } from "./ConnectorCard"
import { CONNECTOR_DEFINITIONS } from "./registry"
import type { ConnectorId } from "./types"

interface ConnectStepProps {
    busy: boolean
    awaitingConnectorId: ConnectorId | null
    infoMessage?: string | null
    onConnect: (connectorId: ConnectorId) => void
    onConnectInTab: (connectorId: ConnectorId) => void
}

export function ConnectStep({
    busy,
    awaitingConnectorId,
    infoMessage,
    onConnect,
    onConnectInTab,
}: ConnectStepProps) {
    return (
        <Card>
            <CardHeader
                eyebrow="Step 1"
                title="Choose a source"
                description="Connect where your content lives. More sources are on the way — start with any available connector below."
            />
            {infoMessage ? <Banner tone="info">{infoMessage}</Banner> : null}
            <div className="pf-connector-grid">
                {CONNECTOR_DEFINITIONS.map(connector => (
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
            <div className="pf-actions pf-actions--footer">
                <Link className={buttonClass("secondary")} to={ROUTES.home}>
                    Cancel
                </Link>
            </div>
        </Card>
    )
}
