import type { DataSourceSummary } from "../../../lib/api"
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
                <ul className="pf-select-list">
                    {sources.map(source => (
                        <li key={source.id}>
                            <button
                                type="button"
                                className="pf-select-row"
                                onClick={() => void onSelect(source)}
                            >
                                <span className="pf-select-row-title">{source.title}</span>
                                <span className="pf-muted">Select</span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </Card>
    )
}
