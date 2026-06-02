import { framer } from "framer-plugin"
import { useEffect, useState } from "react"
import { fetchDataSources } from "./api"
import type { NotionDataSourceConfig } from "./data"
import { StepBack, StepHeader, WizardShell } from "./WizardShell"

interface SelectDataSourceProps {
    setupSessionId: string
    onSelectDataSource: (config: NotionDataSourceConfig) => void
    onBack: () => void
}

function DatabaseIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
            <rect x="1" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.25" />
            <rect x="8" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.25" />
            <rect x="1" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.25" />
            <rect x="8" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.25" />
        </svg>
    )
}

export function SelectDataSource({ setupSessionId, onSelectDataSource, onBack }: SelectDataSourceProps) {
    const [sources, setSources] = useState<Array<{ id: string; title: string }>>([])
    const [selectedId, setSelectedId] = useState("")
    const [isLoading, setIsLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)

    useEffect(() => {
        fetchDataSources(setupSessionId)
            .then(list => {
                setSources(list)
                if (list[0]) setSelectedId(list[0].id)
            })
            .catch(error => {
                console.error(error)
                framer.notify("Failed to load Notion databases.", { variant: "error" })
            })
            .finally(() => setIsLoading(false))
    }, [setupSessionId])

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault()
        if (!selectedId) return

        try {
            setIsSubmitting(true)
            const { fetchDataSourceProperties } = await import("./api")
            const properties = await fetchDataSourceProperties(setupSessionId, selectedId)
            const source = sources.find(s => s.id === selectedId)
            onSelectDataSource({
                id: selectedId,
                title: source?.title ?? selectedId,
                databaseId: source?.databaseId,
                properties,
            })
        } catch (error) {
            console.error(error)
            framer.notify("Failed to load database properties.", { variant: "error" })
        } finally {
            setIsSubmitting(false)
        }
    }

    if (isLoading) {
        return (
            <WizardShell setupStep={2}>
                <div className="nf-loading">
                    <div className="framer-spinner" />
                </div>
            </WizardShell>
        )
    }

    return (
        <WizardShell setupStep={2}>
            <form className="nf-page" onSubmit={handleSubmit}>
                <div className="nf-page-body">
                    <div>
                        <StepBack onClick={onBack} />
                        <StepHeader
                            title="Select a database"
                            description="Choose which Notion database will be the source of truth for your Framer CMS."
                        />
                    </div>

                    <div className="nf-db-list">
                        {sources.length === 0 ? (
                            <p className="nf-desc">No databases found in this workspace.</p>
                        ) : (
                            sources.map(s => (
                                <button
                                    key={s.id}
                                    type="button"
                                    className={[
                                        "nf-db-item",
                                        selectedId === s.id ? "nf-db-item--selected" : "",
                                    ]
                                        .filter(Boolean)
                                        .join(" ")}
                                    onClick={() => setSelectedId(s.id)}
                                >
                                    <div className="nf-db-item-main">
                                        <div className="nf-db-icon">
                                            <DatabaseIcon />
                                        </div>
                                        <p className="nf-db-name">{s.title}</p>
                                    </div>
                                    {selectedId === s.id && (
                                        <div className="nf-db-check" aria-hidden>
                                            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                                                <path
                                                    d="M1.5 4L3.5 6L6.5 2"
                                                    stroke="currentColor"
                                                    strokeWidth="1.5"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                />
                                            </svg>
                                        </div>
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </div>

                <div className="nf-page-footer">
                    <button type="submit" className="nf-btn nf-btn--primary" disabled={!selectedId || isSubmitting}>
                        {isSubmitting ? <div className="framer-spinner" /> : "Use this database"}
                    </button>
                </div>
            </form>
        </WizardShell>
    )
}
