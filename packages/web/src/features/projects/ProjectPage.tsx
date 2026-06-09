import { displaySyncError, type PublishMode } from "@notion-framer/shared"
import { useCallback, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { useParams } from "react-router-dom"
import { useAuthContext } from "../../app/AuthContext"
import { ROUTES } from "../../constants/routes"
import {
    fetchDashboardProject,
    triggerDashboardSync,
    updateDashboardPublishSettings,
} from "../../lib/api"
import { ApiError } from "../../lib/api/client"
import { formatRelativeTime } from "../../lib/format"
import { AppShell } from "../../components/layout"
import { Badge, Banner, Button, buttonClass, Card, CardHeader, CheckboxRow, Field, Select, Spinner } from "../../components/ui"
import { ProjectStatusBadge } from "./ProjectStatusBadge"

export function ProjectPage() {
    const { projectId } = useParams<{ projectId: string }>()
    const { auth, refresh } = useAuthContext()
    const [status, setStatus] = useState<Awaited<ReturnType<typeof fetchDashboardProject>> | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [syncing, setSyncing] = useState(false)
    const [savingPublish, setSavingPublish] = useState(false)

    const load = useCallback(async () => {
        if (!projectId) return
        try {
            setError(null)
            setStatus(await fetchDashboardProject(projectId))
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not load project")
        }
    }, [projectId])

    useEffect(() => {
        void load()
        const interval = window.setInterval(() => void load(), 30_000)
        return () => window.clearInterval(interval)
    }, [load])

    const handleSync = async () => {
        if (!projectId) return
        setSyncing(true)
        setError(null)
        try {
            await triggerDashboardSync(projectId)
            await load()
        } catch (err) {
            setError(
                err instanceof ApiError
                    ? err.message
                    : "Sync failed. Try again in a moment."
            )
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
        return <p className="pf-muted">Missing project id</p>
    }

    const persistedSyncError = status ? displaySyncError(status) : null

    return (
        <AppShell
            title={status?.notionDataSourceTitle ?? "Project"}
            subtitle="Sync status and publish settings for this connection."
            backTo={{ label: "All projects", href: ROUTES.home }}
            email={auth?.email}
            onLogout={refresh}
        >
            {error ? <Banner tone="error">{error}</Banner> : null}

            {!status ? (
                <Spinner label="Loading project…" />
            ) : (
                <>
                    <Card>
                        <div className="pf-status-row">
                            <ProjectStatusBadge status={status} />
                            {status.autoSync ? <Badge tone="neutral">Auto-sync on</Badge> : null}
                        </div>

                        <div className="pf-stats">
                            <div className="pf-stat">
                                <span className="pf-stat-label">Last sync</span>
                                <span className="pf-stat-value">{formatRelativeTime(status.lastSyncAt)}</span>
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

                        {persistedSyncError ? (
                            <Banner tone="error" className="pf-banner--inset">
                                {persistedSyncError}
                            </Banner>
                        ) : null}
                    </Card>

                    <Card>
                        <CardHeader title="Publish" />
                        <CheckboxRow
                            checked={status.autoPublish}
                            disabled={savingPublish}
                            onChange={checked =>
                                void handlePublishChange(checked, status.publishMode as PublishMode)
                            }
                        >
                            Auto-publish after sync
                        </CheckboxRow>
                        {status.autoPublish ? (
                            <Field label="Publish mode" htmlFor="publish-mode" className="pf-field--spaced">
                                <Select
                                    id="publish-mode"
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
                                </Select>
                            </Field>
                        ) : null}
                    </Card>

                    <div className="pf-actions">
                        <Button onClick={() => void handleSync()} disabled={syncing}>
                            {syncing ? "Syncing…" : "Sync now"}
                        </Button>
                        <Link className={buttonClass("secondary")} to={ROUTES.setup}>
                            New project
                        </Link>
                    </div>
                </>
            )}
        </AppShell>
    )
}
