import type { ProjectStatus, PublishMode } from "@notion-framer/shared"
import { useCallback, useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { fetchDashboardProject, triggerDashboardSync, updateDashboardPublishSettings } from "../api"
import { Shell } from "../components/Shell"
import { Spinner } from "../components/Spinner"
import { StatusBadge } from "../components/StatusBadge"

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

function healthTone(status: ProjectStatus): "ok" | "warn" | "err" {
    if (status.lastError) return "err"
    if (status.autoSync && status.webhookStatus !== "active") return "warn"
    return "ok"
}

function healthLabel(status: ProjectStatus): string {
    if (status.lastError) return "Error"
    if (status.autoSync && status.webhookStatus !== "active") return "Webhook pending"
    return "Healthy"
}

export function ProjectPage() {
    const { projectId } = useParams<{ projectId: string }>()
    const [status, setStatus] = useState<ProjectStatus | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [syncing, setSyncing] = useState(false)
    const [savingPublish, setSavingPublish] = useState(false)

    const refresh = useCallback(async () => {
        if (!projectId) return
        try {
            setError(null)
            setStatus(await fetchDashboardProject(projectId))
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not load project")
        }
    }, [projectId])

    useEffect(() => {
        void refresh()
        const interval = window.setInterval(() => void refresh(), 30_000)
        return () => window.clearInterval(interval)
    }, [refresh])

    const handleSync = async () => {
        if (!projectId) return
        setSyncing(true)
        setError(null)
        try {
            await triggerDashboardSync(projectId)
            await refresh()
        } catch (err) {
            setError(err instanceof Error ? err.message : "Sync failed")
        } finally {
            setSyncing(false)
        }
    }

    const handlePublishChange = async (autoPublish: boolean, publishMode: PublishMode) => {
        if (!projectId) return
        setSavingPublish(true)
        try {
            setStatus(await updateDashboardPublishSettings(projectId, { autoPublish, publishMode }))
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not save publish settings")
        } finally {
            setSavingPublish(false)
        }
    }

    if (!projectId) {
        return <p className="pf-meta">Missing project id</p>
    }

    return (
        <Shell
            title={status?.notionDataSourceTitle ?? "Project"}
            subtitle="Sync status and publish settings for this connection."
            backTo={{ label: "All projects", href: "/" }}
        >
            {error ? <div className="pf-banner pf-banner--err">{error}</div> : null}

            {!status ? (
                <Spinner label="Loading project…" />
            ) : (
                <>
                    <div className="pf-card">
                        <div className="pf-meta-row" style={{ marginBottom: "1.25rem" }}>
                            <StatusBadge tone={healthTone(status)}>{healthLabel(status)}</StatusBadge>
                            {status.autoSync ? (
                                <StatusBadge tone="neutral">Auto-sync on</StatusBadge>
                            ) : null}
                        </div>

                        <div className="pf-stats">
                            <div className="pf-stat">
                                <span className="pf-stat-label">Last sync</span>
                                <span className="pf-stat-value">{formatRelative(status.lastSyncAt)}</span>
                            </div>
                            <div className="pf-stat">
                                <span className="pf-stat-label">Items synced</span>
                                <span className="pf-stat-value">{status.itemsSyncedCount}</span>
                            </div>
                            <div className="pf-stat">
                                <span className="pf-stat-label">Webhook</span>
                                <span className="pf-stat-value">{status.webhookStatus ?? "—"}</span>
                            </div>
                        </div>

                        {status.lastError ? (
                            <div className="pf-banner pf-banner--err" style={{ marginTop: "1.25rem", marginBottom: 0 }}>
                                {status.lastError}
                            </div>
                        ) : null}
                    </div>

                    <div className="pf-card">
                        <h2 className="pf-card-title">Publish</h2>
                        <label className="pf-check-row">
                            <input
                                type="checkbox"
                                checked={status.autoPublish}
                                disabled={savingPublish}
                                onChange={e =>
                                    void handlePublishChange(
                                        e.target.checked,
                                        status.publishMode as PublishMode
                                    )
                                }
                            />
                            Auto-publish after sync
                        </label>
                        {status.autoPublish ? (
                            <div className="pf-field" style={{ marginTop: "0.5rem" }}>
                                <label htmlFor="publish-mode">Publish mode</label>
                                <select
                                    id="publish-mode"
                                    className="pf-select"
                                    value={status.publishMode}
                                    disabled={savingPublish}
                                    onChange={e =>
                                        void handlePublishChange(
                                            status.autoPublish,
                                            e.target.value as PublishMode
                                        )
                                    }
                                >
                                    <option value="deploy_live">Deploy to live site</option>
                                    <option value="preview_only">Preview only</option>
                                </select>
                            </div>
                        ) : null}
                    </div>

                    <div className="pf-actions">
                        <button type="button" onClick={() => void handleSync()} disabled={syncing}>
                            {syncing ? "Syncing…" : "Sync now"}
                        </button>
                        <Link className="pf-button secondary" to="/setup">
                            New project
                        </Link>
                    </div>
                </>
            )}
        </Shell>
    )
}
