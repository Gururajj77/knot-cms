import { framer } from "framer-plugin"
import { useEffect, useState } from "react"
import { fetchDataSources } from "./api"
import type { NotionDataSourceConfig } from "./data"

interface SelectDataSourceProps {
    setupSessionId: string
    onSelectDataSource: (config: NotionDataSourceConfig) => void
    onBack: () => void
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
            <main className="loading">
                <div className="framer-spinner" />
            </main>
        )
    }

    return (
        <main className="framer-hide-scrollbar setup">
            <div className="intro">
                <div className="content">
                    <h2>Choose database</h2>
                    <p>Select the Notion database to sync with this collection.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <label htmlFor="dataSource">
                    <select
                        id="dataSource"
                        value={selectedId}
                        onChange={e => setSelectedId(e.target.value)}
                    >
                        {sources.length === 0 ? (
                            <option value="">No databases found</option>
                        ) : (
                            sources.map(s => (
                                <option key={s.id} value={s.id}>
                                    {s.title}
                                </option>
                            ))
                        )}
                    </select>
                </label>
                <div className="actions-row">
                    <button type="button" className="secondary" onClick={onBack}>
                        Back
                    </button>
                    <button type="submit" disabled={!selectedId || isSubmitting}>
                        {isSubmitting ? <div className="framer-spinner" /> : "Next"}
                    </button>
                </div>
            </form>
        </main>
    )
}
