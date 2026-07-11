import { Check, ChevronDown } from "lucide-react"
import { Link } from "react-router-dom"
import type { SetupPathId } from "@knotcms/shared"
import type { FramerCollectionSummary } from "../../../lib/api"
import { ROUTES } from "../../../constants/routes"
import { ConnectorLogo, FramerLogo } from "../../../components/brand"
import { Button, Field, Input, buttonClass } from "../../../components/ui"
import { ConnectorCard } from "../connectors/ConnectorCard"
import { SETUP_CONNECTOR_IDS, getSetupWizardPlugin } from "../connectors/setup-registry"
import { getConnector } from "../connectors/registry"
import type { ConnectorId } from "../connectors/types"
import { SourcePathStep } from "./SourcePathStep"
import { FramerCollectionPicker } from "./FramerCollectionPicker"

interface SetupConnectStepProps {
    connectorId: ConnectorId | null
    setupSessionId: string | null
    framerProjectUrl: string
    framerApiKey: string
    collections: FramerCollectionSummary[]
    selectedCollectionId: string | null
    collectionsLoaded: boolean
    framerCredentialsVerified: boolean
    path: SetupPathId | null
    showAdvanced: boolean
    busy: boolean
    awaitingConnectorId: ConnectorId | null
    onConnect: (connectorId: ConnectorId) => void
    onConnectInTab: (connectorId: ConnectorId) => void
    onUrlChange: (url: string) => void
    onKeyChange: (key: string) => void
    onLoadCollections: () => void
    onSelectCollection: (collectionId: string | null) => void
    onPathChange: (path: SetupPathId) => void
    onShowAdvancedChange: (show: boolean) => void
    onContinue: () => void
}

export function SetupConnectStep({
    connectorId,
    setupSessionId,
    framerProjectUrl,
    framerApiKey,
    collections,
    selectedCollectionId,
    collectionsLoaded,
    framerCredentialsVerified,
    path,
    showAdvanced,
    busy,
    awaitingConnectorId,
    onConnect,
    onConnectInTab,
    onUrlChange,
    onKeyChange,
    onLoadCollections,
    onSelectCollection,
    onPathChange,
    onShowAdvancedChange,
    onContinue,
}: SetupConnectStepProps) {
    const isConnected = Boolean(setupSessionId && connectorId)
    const plugin = connectorId ? getSetupWizardPlugin(connectorId) : null
    const pathOptions = plugin?.getPathOptions() ?? []
    const activePath = pathOptions.find(option => option.id === path) ?? null
    const needsFramerCollection = activePath?.requiresFramerCollection ?? false
    const canLoadFramer = framerProjectUrl.trim().length > 0 && framerApiKey.trim().length >= 8
    const canContinue =
        isConnected &&
        canLoadFramer &&
        (!needsFramerCollection || Boolean(selectedCollectionId))

    return (
        <div className="pf-setup-step">
            <header className="pf-setup-step-header">
                <p className="pf-eyebrow">Step 1 · Connect</p>
                <h2 className="pf-setup-step-title">Connect your content and Framer site</h2>
                <p className="pf-setup-step-desc">
                    Link where you write content and the Framer project KnotCMS will sync into. Most
                    projects only need Notion and a Server API key.
                </p>
            </header>

            <section className="pf-setup-section">
                <div className="pf-setup-section-head">
                    <h3 className="pf-setup-section-title">Content source</h3>
                    <p className="pf-setup-section-desc">
                        {isConnected && plugin
                            ? `${plugin.providerLabel} is connected for this setup.`
                            : "Pick where your content lives. You can authorize in a popup or this tab."}
                    </p>
                </div>

                {isConnected && connectorId && plugin ? (
                    <div className="pf-connect-status">
                        <ConnectorLogo id={plugin.logoId} size={20} />
                        <div className="pf-connect-status-copy">
                            <span className="pf-connect-status-label">{plugin.providerLabel} connected</span>
                            <span className="pf-connect-status-hint">Ready for the next step</span>
                        </div>
                        <Check size={18} className="pf-connect-status-check" aria-hidden />
                    </div>
                ) : (
                    <div className="pf-connector-list pf-connector-list--compact">
                        {SETUP_CONNECTOR_IDS.map(id => {
                            const connector = getConnector(id).definition
                            return (
                                <ConnectorCard
                                    key={connector.id}
                                    connector={connector}
                                    busy={busy}
                                    awaiting={awaitingConnectorId === connector.id}
                                    onConnect={onConnect}
                                    onConnectInTab={onConnectInTab}
                                />
                            )
                        })}
                    </div>
                )}
            </section>

            <section className="pf-setup-section pf-setup-section--accent">
                <div className="pf-setup-section-head">
                    <h3 className="pf-setup-section-title">
                        <FramerLogo size={18} />
                        Framer site
                    </h3>
                    <p className="pf-setup-section-desc">
                        In Framer, open <strong>Site settings → API Keys</strong> and create a Server
                        API key. KnotCMS uses it to create or update CMS collections.
                    </p>
                </div>

                <div className="pf-form-grid">
                    <Field label="Framer project URL" htmlFor="framer-url">
                        <Input
                            id="framer-url"
                            placeholder="https://framer.com/projects/..."
                            value={framerProjectUrl}
                            onChange={e => onUrlChange(e.target.value)}
                        />
                    </Field>

                    <Field label="Server API key" htmlFor="framer-key">
                        <Input
                            id="framer-key"
                            type="password"
                            autoComplete="off"
                            value={framerApiKey}
                            onChange={e => onKeyChange(e.target.value)}
                        />
                    </Field>
                </div>

                {framerCredentialsVerified ? (
                    <p className="pf-inline-ok pf-inline-ok--spaced">
                        <Check size={15} aria-hidden />
                        Framer credentials verified
                    </p>
                ) : null}

                <FramerCollectionPicker
                    collections={collections}
                    selectedCollectionId={selectedCollectionId}
                    collectionsLoaded={collectionsLoaded}
                    busy={busy}
                    canLoad={canLoadFramer}
                    required={needsFramerCollection}
                    onLoadCollections={onLoadCollections}
                    onSelectCollection={onSelectCollection}
                />
            </section>

            <details
                className="pf-setup-advanced"
                open={showAdvanced}
                onToggle={event => onShowAdvancedChange((event.target as HTMLDetailsElement).open)}
            >
                <summary className="pf-setup-advanced-summary">
                    <span>Advanced setup options</span>
                    <ChevronDown size={16} className="pf-setup-advanced-chevron" aria-hidden />
                </summary>
                <div className="pf-setup-advanced-body">
                    <p className="pf-setup-advanced-lead">
                        Use these if you already have Framer CMS collections to map, or want KnotCMS to
                        create a Notion database from Framer content.
                    </p>

                    {plugin ? (
                        <SourcePathStep
                            path={path}
                            pathOptions={pathOptions}
                            reconfigureMode={false}
                            embedded
                            selectedFramerCollection={
                                selectedCollectionId
                                    ? (collections.find(c => c.id === selectedCollectionId) ?? null)
                                    : null
                            }
                            onPathChange={onPathChange}
                        />
                    ) : null}
                </div>
            </details>

            <footer className="pf-setup-footer pf-setup-footer--split">
                <Link className={buttonClass("ghost")} to={ROUTES.home}>
                    Cancel
                </Link>
                <Button onClick={() => void onContinue()} disabled={!canContinue || busy}>
                    {busy ? "Verifying…" : "Continue"}
                </Button>
            </footer>
        </div>
    )
}
