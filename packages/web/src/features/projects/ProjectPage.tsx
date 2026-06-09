import { displaySyncError, type PublishMode } from "@notion-framer/shared"
import { useCallback, useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { useAuthContext } from "../../app/AuthContext"
import { ROUTES } from "../../constants/routes"
import {
    deleteDashboardProject,
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
    const navigate = useNavigate()
    const { auth, refresh } = useAuthContext()
    const [status, setStatus] = useState<Awaited<ReturnType<typeof fetchDashboardProject>> | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [syncing, setSyncing] = useState(false)
    const [savingPublish, setSavingPublish] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [deleteFramerCollection, setDeleteFramerCollection] = useState(true)

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

    const handleDelete = async () => {
        if (!projectId || !status) return

        const collectionLabel = status.framerCollectionName ?? "Framer CMS collection"
        const confirmed = window.confirm(
            deleteFramerCollection
                ? `Delete this project and clear all items from “${collectionLabel}” in Framer?`
                : "Delete this project? The Framer collection will be left unchanged."
        )
        if (!confirmed) return

        setDeleting(true)
        setError(null)
        try {
            const result = await deleteDashboardProject(projectId, { deleteFramerCollection })
            if (result.framerWarning) {
                sessionStorage.setItem(
                    "pf_delete_warning",
                    `Project deleted, but Framer cleanup failed: ${result.framerWarning}`
                )
            }
            navigate(ROUTES.home)
        } catch (err) {
            setError(
                err instanceof ApiError
                    ? err.message
                    : "Could not delete project. Try again in a moment."
            )
        } finally {
            setDeleting(false)
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
                <div className="pf-stack">
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
                        <div className="pf-card-footer">
                            <Button onClick={() => void handleSync()} disabled={syncing || deleting}>
                                {syncing ? "Syncing…" : "Sync now"}
                            </Button>
                            <Link className={buttonClass("secondary")} to={ROUTES.setup}>
                                New project
                            </Link>
                        </div>
                    </Card>

                    <Card className="pf-card--danger">
                        <CardHeader
                            title="Delete project"
                            description="Remove this connection from PublishFlow. Optionally clear synced content from Framer CMS."
                        />
                        <CheckboxRow
                            checked={deleteFramerCollection}
                            disabled={deleting}
                            onChange={setDeleteFramerCollection}
                        >
                            Clear Framer CMS collection (removes all synced items and fields)
                        </CheckboxRow>
                        <p className="pf-muted pf-danger-hint">
                            Framer does not expose a delete-collection API — the empty collection may
                            still appear in your Framer project until you remove it manually.
                        </p>
                        <div className="pf-card-footer">
                            <Button variant="danger" onClick={() => void handleDelete()} disabled={deleting}>
                                {deleting ? "Deleting…" : "Delete project"}
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </AppShell>
    )
}
