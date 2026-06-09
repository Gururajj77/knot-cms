import { ChevronRight } from "lucide-react"
import type { DataSourceSummary } from "../../../lib/api"
import { ConnectorLogo } from "../../../components/brand"
import { Card, CardHeader, Spinner } from "../../../components/ui"

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
        <Card>
            <CardHeader
                eyebrow="Step 2"
                title="Choose data to sync"
                description={sourcePickerDescription}
            />
            {busy ? (
                <Spinner label="Loading databases…" />
            ) : (
                <div className="pf-panel pf-panel--flush">
                    <ul className="pf-select-list pf-select-list--flush">
                        {sources.map(source => (
                            <li key={source.id}>
                                <button
                                    type="button"
                                    className="pf-select-row"
                                    onClick={() => void onSelect(source)}
                                >
                                    <span className="pf-select-row-main">
                                        <ConnectorLogo id="notion" size={16} />
                                        <span className="pf-select-row-title">{source.title}</span>
                                    </span>
                                    <ChevronRight size={15} className="pf-select-row-chevron" aria-hidden />
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </Card>
    )
}
