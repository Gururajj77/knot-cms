import { Badge, Button } from "../../../components/ui"
import type { ConnectorDefinition, ConnectorId } from "./types"

interface ConnectorCardProps {
    connector: ConnectorDefinition
    busy: boolean
    awaiting: boolean
    onConnect: (connectorId: ConnectorId) => void
    onConnectInTab: (connectorId: ConnectorId) => void
}

export function ConnectorCard({ connector, busy, awaiting, onConnect, onConnectInTab }: ConnectorCardProps) {
    const isComingSoon = connector.status === "coming_soon"
    const isAvailable = connector.status === "available"

    return (
        <article
            className={`pf-connector-card${isComingSoon ? " pf-connector-card--disabled" : ""}`}
            aria-labelledby={`connector-${connector.id}-title`}
        >
            <div className="pf-connector-card-head">
                <h3 id={`connector-${connector.id}-title`} className="pf-connector-card-title">
                    {connector.name}
                </h3>
                {isComingSoon ? <Badge tone="neutral">Coming soon</Badge> : null}
            </div>
            <p className="pf-connector-card-desc">{connector.description}</p>

            {isAvailable ? (
                <>
                    {awaiting ? (
                        <p className="pf-connector-card-waiting">
                            Waiting for {connector.name} authorization in the popup…
                        </p>
                    ) : null}
                    <div className="pf-connector-card-actions">
                        <Button onClick={() => onConnect(connector.id)} disabled={busy}>
                            {awaiting ? `Reopen ${connector.name}` : `Connect ${connector.name}`}
                        </Button>
                        <Button variant="secondary" onClick={() => void onConnectInTab(connector.id)} disabled={busy}>
                            Continue in this tab
                        </Button>
                    </div>
                </>
            ) : null}
        </article>
    )
}
