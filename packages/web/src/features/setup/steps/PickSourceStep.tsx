import { ChevronRight } from "lucide-react"
import type { SetupPathId } from "@knotcms/shared"
import type { DataSourceSummary } from "../../../lib/api"
import { ConnectorLogo } from "../../../components/brand"
import { Banner, Spinner } from "../../../components/ui"
import type { ConnectorLogoId } from "../../../components/brand"
import type { SetupWizardPlugin } from "../connectors/setup-plugin"

interface PickSourceStepProps {
    plugin: SetupWizardPlugin
    path: SetupPathId
    sources: DataSourceSummary[]
    busy: boolean
    reconfigureMode: boolean
    currentSourceId?: string | null
    hideDescription?: boolean
    onSelectSource: (source: DataSourceSummary) => void
}

export function PickSourceStep({
    plugin,
    path,
    sources,
    busy,
    reconfigureMode,
    currentSourceId = null,
    hideDescription = false,
    onSelectSource,
}: PickSourceStepProps) {
    const logoId: ConnectorLogoId = plugin.logoId

    return (
        <section className="pf-setup-section">
            <div
                className={`pf-setup-section-head${hideDescription ? " pf-setup-section-head--compact" : ""}`}
            >
                <h3 className="pf-setup-section-title">
                    {reconfigureMode ? `Choose ${plugin.sourceItemLabel}` : plugin.pickSourceTitle(path)}
                </h3>
                {hideDescription ? null : (
                    <p className="pf-setup-section-desc">
                        {plugin.pickSourceDescription(path, reconfigureMode)}
                    </p>
                )}
            </div>

            {reconfigureMode && currentSourceId ? (
                <Banner tone="info" className="pf-banner--inset">
                    Current source:{" "}
                    <strong>
                        {sources.find(source => source.id === currentSourceId)?.title ??
                            "Connected source"}
                    </strong>
                </Banner>
            ) : null}

            {busy && sources.length === 0 ? (
                <Spinner label={plugin.sourcesLoadingLabel} />
            ) : (
                <div className="pf-data-panel">
                    <ul className="pf-select-list pf-select-list--flush">
                        {sources.map(source => {
                            const isCurrent = currentSourceId === source.id
                            return (
                                <li key={source.id}>
                                    <button
                                        type="button"
                                        className={`pf-select-row${isCurrent ? " pf-collection-row--selected" : ""}`}
                                        onClick={() => void onSelectSource(source)}
                                        disabled={busy}
                                    >
                                        <span className="pf-select-row-main">
                                            <ConnectorLogo id={logoId} size={18} />
                                            <span className="pf-select-row-title">
                                                {source.title}
                                                {isCurrent ? " (current)" : ""}
                                            </span>
                                        </span>
                                        <ChevronRight
                                            size={16}
                                            className="pf-select-row-chevron"
                                            aria-hidden
                                        />
                                    </button>
                                </li>
                            )
                        })}
                    </ul>
                </div>
            )}
        </section>
    )
}
