import type { SetupPathId } from "@knotcms/shared"
import type { DataSourceSummary, FramerCollectionSummary } from "../../../lib/api"
import { Button } from "../../../components/ui"
import { ConnectStep } from "../connectors/ConnectStep"
import { SETUP_CONNECTOR_IDS, getSetupWizardPlugin } from "../connectors/setup-registry"
import type { ConnectorId } from "../connectors/types"
import { NotionBootstrapStep } from "./notion/NotionBootstrapStep"
import { PickSourceStep } from "./PickSourceStep"
import { SourcePathStep } from "./SourcePathStep"

interface SourceStepProps {
    path: SetupPathId | null
    connectorId: ConnectorId
    setupSessionId: string | null
    sources: DataSourceSummary[]
    selectedFramerCollection: FramerCollectionSummary | null
    importRowMax: number
    importRowCount: number
    bootstrapWarnings: string[]
    busy: boolean
    awaitingConnectorId: ConnectorId | null
    reconfigureMode?: boolean
    currentSourceId?: string | null
    onPathChange: (path: SetupPathId) => void
    onConnect: (connectorId: ConnectorId) => void
    onConnectInTab: (connectorId: ConnectorId) => void
    onImportRowCountChange: (count: number) => void
    onSelectAllImportRows: () => void
    onBootstrapSource: () => void
    onSelectExistingSource: (source: DataSourceSummary) => void
    onBack: () => void
}

export function SourceStep({
    path,
    connectorId,
    setupSessionId,
    sources,
    selectedFramerCollection,
    importRowMax,
    importRowCount,
    bootstrapWarnings,
    busy,
    awaitingConnectorId,
    reconfigureMode = false,
    currentSourceId = null,
    onPathChange,
    onConnect,
    onConnectInTab,
    onImportRowCountChange,
    onSelectAllImportRows,
    onBootstrapSource,
    onSelectExistingSource,
    onBack,
}: SourceStepProps) {
    const plugin = getSetupWizardPlugin(connectorId)
    const pathOptions = plugin.getPathOptions()
    const isConnected = Boolean(setupSessionId)

    const activePath = pathOptions.find(option => option.id === path) ?? null
    const needsFramerCollection = activePath?.requiresFramerCollection ?? false
    const missingFramerCollection = needsFramerCollection && !selectedFramerCollection
    const showBootstrap =
        !reconfigureMode &&
        plugin.supportsBootstrapPath(path) &&
        selectedFramerCollection &&
        !missingFramerCollection
    const showPickSource =
        Boolean(path) &&
        !missingFramerCollection &&
        (!plugin.supportsBootstrapPath(path) || reconfigureMode)

    if (!reconfigureMode && !isConnected) {
        return (
            <ConnectStep
                busy={busy}
                awaitingConnectorId={awaitingConnectorId}
                connectorIds={SETUP_CONNECTOR_IDS}
                onConnect={onConnect}
                onConnectInTab={onConnectInTab}
            />
        )
    }

    return (
        <div className="pf-setup-step">
            <header className="pf-setup-step-header">
                <p className="pf-eyebrow">Step 2 · {plugin.providerLabel}</p>
                <h2 className="pf-setup-step-title">
                    {reconfigureMode ? `Change ${plugin.sourceItemLabel}` : "Choose how to sync"}
                </h2>
                <p className="pf-setup-step-desc">
                    {reconfigureMode
                        ? `Pick a different ${plugin.sourceItemLabel} or re-select the current one to update field mapping.`
                        : `Tell KnotCMS how to link ${plugin.providerLabel} with your Framer project.`}
                </p>
            </header>

            <SourcePathStep
                path={path}
                pathOptions={pathOptions}
                reconfigureMode={reconfigureMode}
                selectedFramerCollection={selectedFramerCollection}
                onPathChange={onPathChange}
            />

            {showBootstrap ? (
                <NotionBootstrapStep
                    selectedFramerCollection={selectedFramerCollection}
                    importRowMax={importRowMax}
                    importRowCount={importRowCount}
                    bootstrapWarnings={bootstrapWarnings}
                    busy={busy}
                    onImportRowCountChange={onImportRowCountChange}
                    onSelectAllImportRows={onSelectAllImportRows}
                />
            ) : null}

            {showPickSource && path ? (
                <PickSourceStep
                    plugin={plugin}
                    path={path}
                    sources={sources}
                    busy={busy}
                    reconfigureMode={reconfigureMode}
                    currentSourceId={currentSourceId}
                    onSelectSource={onSelectExistingSource}
                />
            ) : null}

            <footer className="pf-setup-footer pf-setup-footer--split">
                <Button variant="secondary" onClick={onBack}>
                    Back
                </Button>
                {showBootstrap &&
                setupSessionId &&
                selectedFramerCollection.bootstrapPreview.eligible ? (
                    <Button onClick={() => void onBootstrapSource()} disabled={busy}>
                        {busy
                            ? "Creating…"
                            : (plugin.bootstrapFooterLabel ?? "Create source")}
                    </Button>
                ) : null}
            </footer>
        </div>
    )
}
