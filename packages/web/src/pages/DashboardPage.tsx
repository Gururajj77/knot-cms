import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import type { ProjectStatus } from "@notion-framer/shared"
import { fetchDashboardProjects } from "../api"
import { Shell } from "../components/Shell"
import { Spinner } from "../components/Spinner"
import { StatusBadge } from "../components/StatusBadge"

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

function projectTone(project: ProjectStatus): "ok" | "warn" | "err" {
    if (project.lastError) return "err"
    if (project.autoSync && project.webhookStatus !== "active") return "warn"
    return "ok"
}

function projectStatusLabel(project: ProjectStatus): string {
    if (project.lastError) return "Error"
    if (project.autoSync && project.webhookStatus !== "active") return "Webhook pending"
    return "Healthy"
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
        <Shell
            title="Projects"
            subtitle="Notion databases synced to your Framer CMS collections."
            onLogout={onLogout}
        >
            {error ? <div className="pf-banner pf-banner--err">{error}</div> : null}

            <div className="pf-toolbar">
                <span className="pf-meta">
                    {loading ? "Loading…" : `${projects.length} project${projects.length === 1 ? "" : "s"}`}
                </span>
                <Link className="pf-button" to="/setup">
                    New project
                </Link>
            </div>

            <div className="pf-card">
                {loading ? (
                    <Spinner label="Loading projects…" />
                ) : projects.length === 0 ? (
                    <div className="pf-empty">
                        <div className="pf-empty-icon" aria-hidden>
                            ↻
                        </div>
                        <h2 className="pf-empty-title">No projects yet</h2>
                        <p className="pf-empty-text">
                            Connect Notion and Framer to create your first sync pipeline.
                        </p>
                        <Link className="pf-button" to="/setup">
                            Create your first project
                        </Link>
                    </div>
                ) : (
                    <ul className="pf-list">
                        {projects.map(project => (
                            <li key={project.id} className="pf-list-item">
                                <div>
                                    <div className="pf-meta-row" style={{ marginBottom: "0.375rem" }}>
                                        <StatusBadge tone={projectTone(project)}>
                                            {projectStatusLabel(project)}
                                        </StatusBadge>
                                    </div>
                                    <p className="pf-list-item-title">
                                        {project.notionDataSourceTitle ?? "Untitled"}
                                    </p>
                                    <p className="pf-meta">
                                        Last sync {formatRelative(project.lastSyncAt)}
                                        <span className="pf-dot"> · </span>
                                        {project.itemsSyncedCount} items
                                    </p>
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
