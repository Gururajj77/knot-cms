import { ArrowRight, Loader2 } from "lucide-react"
import { Badge, Button } from "../../../components/ui"
import { ConnectorLogo, type ConnectorLogoId } from "../../../components/brand"
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
            className={`pf-connector-option${isComingSoon ? " pf-connector-option--soon" : ""}${isAvailable ? " pf-connector-option--available" : ""}`}
            aria-labelledby={`connector-${connector.id}-title`}
        >
            <div className="pf-connector-option-main">
                <ConnectorLogo id={connector.id as ConnectorLogoId} size={22} />
                <div className="pf-connector-option-copy">
                    <div className="pf-connector-option-title-row">
                        <h3 id={`connector-${connector.id}-title`} className="pf-connector-option-title">
                            {connector.name}
                        </h3>
                        {isComingSoon ? <Badge tone="neutral">Coming soon</Badge> : null}
                    </div>
                    <p className="pf-connector-option-desc">{connector.description}</p>
                    {awaiting ? (
                        <p className="pf-connector-option-waiting">
                            <Loader2 size={14} className="pf-spin-icon" aria-hidden />
                            Waiting for authorization…
                        </p>
                    ) : null}
                </div>
            </div>

            {isAvailable ? (
                <div className="pf-connector-option-actions">
                    <Button onClick={() => onConnect(connector.id)} disabled={busy}>
                        {awaiting ? "Reopen" : "Connect"}
                        <ArrowRight size={15} aria-hidden />
                    </Button>
                    <button
                        type="button"
                        className="pf-connector-option-alt"
                        disabled={busy}
                        onClick={() => void onConnectInTab(connector.id)}
                    >
                        Use this tab
                    </button>
                </div>
            ) : null}
        </article>
    )
}
