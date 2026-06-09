import { ChevronRight } from "lucide-react"
import type { DataSourceSummary } from "../../../lib/api"
import { ConnectorLogo } from "../../../components/brand"
import { Spinner } from "../../../components/ui"

interface SelectDatabaseStepProps {
    busy: boolean
    sources: DataSourceSummary[]
    sourcePickerDescription: string
    onSelect: (source: DataSourceSummary) => void
}

export function SelectDatabaseStep({
    busy,
    sources,
    sourcePickerDescription,
    onSelect,
}: SelectDatabaseStepProps) {
    return (
        <div className="pf-setup-step">
            <header className="pf-setup-step-header">
                <p className="pf-eyebrow">Step 2 · Data</p>
                <h2 className="pf-setup-step-title">Choose what to sync</h2>
                <p className="pf-setup-step-desc">{sourcePickerDescription}</p>
            </header>

            {busy ? (
                <Spinner label="Loading databases…" />
            ) : (
                <div className="pf-data-panel">
                    <ul className="pf-select-list pf-select-list--flush">
                        {sources.map(source => (
                            <li key={source.id}>
                                <button
                                    type="button"
                                    className="pf-select-row"
                                    onClick={() => void onSelect(source)}
                                >
                                    <span className="pf-select-row-main">
                                        <ConnectorLogo id="notion" size={18} />
                                        <span className="pf-select-row-title">{source.title}</span>
                                    </span>
                                    <ChevronRight size={16} className="pf-select-row-chevron" aria-hidden />
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    )
}
