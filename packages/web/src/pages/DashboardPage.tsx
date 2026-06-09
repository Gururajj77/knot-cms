import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import type { ProjectStatus } from "@notion-framer/shared"
import { fetchDashboardProjects } from "../api"
import { Shell } from "../components/Shell"

interface DashboardPageProps {
    onLogout: () => void
}

function formatRelative(iso: string | null): string {
    if (!iso) return "Never"
    const diff = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diff / 60_000)
    if (mins < 1) return "Just now"
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
}

export function DashboardPage({ onLogout }: DashboardPageProps) {
    const [projects, setProjects] = useState<ProjectStatus[]>([])
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        void (async () => {
            try {
                setProjects(await fetchDashboardProjects())
            } catch (err) {
                setError(err instanceof Error ? err.message : "Could not load projects")
            } finally {
                setLoading(false)
            }
        })()
    }, [])

    return (
        <Shell title="Projects" onLogout={onLogout}>
            <p className="pf-subtitle">Notion databases synced to your Framer CMS collections.</p>

            {error ? <div className="pf-banner pf-banner--err">{error}</div> : null}

            <div className="pf-actions">
                <Link className="pf-button" to="/setup">
                    New project
                </Link>
            </div>

            <div className="pf-card" style={{ marginTop: "1.25rem" }}>
                {loading ? (
                    <p className="pf-meta">Loading projects…</p>
                ) : projects.length === 0 ? (
                    <p className="pf-meta">No projects yet. Connect Notion and Framer to get started.</p>
                ) : (
                    <ul className="pf-list">
                        {projects.map(project => (
                            <li key={project.id} className="pf-list-item">
                                <div>
                                    <strong>{project.notionDataSourceTitle ?? "Untitled"}</strong>
                                    <div className="pf-meta">
                                        Last sync {formatRelative(project.lastSyncAt)} · {project.itemsSyncedCount}{" "}
                                        items
                                    </div>
                                </div>
                                <Link className="pf-button secondary" to={`/projects/${project.id}`}>
                                    Open
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </Shell>
    )
}
