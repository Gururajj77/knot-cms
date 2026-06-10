import { displaySyncError, type PublishMode, type SyncResult } from "@nocms/shared"
import { Clock, Database, RefreshCw, Trash2, Webhook } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
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
import {
    formatPublishCooldownMessage,
    usePublishCooldownRemaining,
} from "../../lib/publish-cooldown"
import { projectHealthTone } from "../../lib/project-health"
import { formatSyncFeedback, type SyncFeedbackTone } from "../../lib/sync"
import { useProjectStatusPoll } from "../../lib/use-project-status-poll"
import { needsWebhookSetup, webhookStatusLabel } from "../../lib/webhook"
import { FramerLogo, NotionLogo } from "../../components/brand"
import { AppShell } from "../../components/layout"
import {
    Badge,
    Banner,
    Button,
    CheckboxRow,
    Field,
    Modal,
    Select,
    Skeleton,
    ToggleRow,
    useToast,
} from "../../components/ui"
import { ProjectStatusBadge } from "./ProjectStatusBadge"
import { WebhookSetupCard } from "./WebhookSetupCard"

function ProjectPageSkeleton() {
    return (
        <div className="pf-stack">
            <div className="pf-metric-strip">
                <Skeleton height={72} />
                <Skeleton height={72} />
                <Skeleton height={72} />
            </div>
            <Skeleton height={160} className="pf-skeleton--block" />
        </div>
    )
}

export function ProjectPage() {
    const { projectId } = useParams<{ projectId: string }>()
    const navigate = useNavigate()
    const { auth, refresh } = useAuthContext()
    const { toast } = useToast()
    const [status, setStatus] = useState<Awaited<ReturnType<typeof fetchDashboardProject>> | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [syncing, setSyncing] = useState(false)
    const [savingPublish, setSavingPublish] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [deleteFramerCollection, setDeleteFramerCollection] = useState(true)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [syncFeedback, setSyncFeedback] = useState<{ tone: SyncFeedbackTone; message: string } | null>(
        null
    )

    const load = useCallback(async () => {
        if (!projectId) return
        try {
            setError(null)
            setStatus(await fetchDashboardProject(projectId))
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not load project")
        }
    }, [projectId])

    const publishCooldownSec = usePublishCooldownRemaining(status?.publishCooldownRemainingSec)

    useEffect(() => {
        void load()
    }, [load])

    useProjectStatusPoll(load, status, publishCooldownSec)

    const handleSync = async () => {
        if (!projectId) return
        setSyncing(true)
        setError(null)
        setSyncFeedback(null)
        try {
            const result: SyncResult = await triggerDashboardSync(projectId)
            const feedback = formatSyncFeedback(result)
            setSyncFeedback(feedback)
            toast(feedback.message, feedback.tone === "success" ? "success" : "info")
            await load()
        } catch (err) {
            const message =
                err instanceof ApiError ? err.message : "Sync failed. Try again in a moment."
            setError(message)
            toast(message, "error")
        } finally {
            setSyncing(false)
        }
    }

    const handleDelete = async () => {
        if (!projectId) return

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
            toast("Project deleted", "success")
            navigate(ROUTES.home)
        } catch (err) {
            const message =
                err instanceof ApiError ? err.message : "Could not delete project. Try again in a moment."
            setError(message)
            toast(message, "error")
        } finally {
            setDeleting(false)
            setShowDeleteModal(false)
        }
    }

    const handlePublishChange = async (autoPublish: boolean, publishMode: PublishMode) => {
        if (!projectId) return
        setSavingPublish(true)
        try {
            setStatus(await updateDashboardPublishSettings(projectId, { autoPublish, publishMode }))
            toast("Publish settings saved", "success")
        } catch (err) {
            const message = err instanceof Error ? err.message : "Could not save publish settings"
            setError(message)
            toast(message, "error")
        } finally {
            setSavingPublish(false)
        }
    }

    if (!projectId) {
        return <p className="pf-muted">Missing project id</p>
    }

    const persistedSyncError = status ? displaySyncError(status) : null
    const collectionLabel = status?.framerCollectionName ?? "Framer CMS collection"
    const health = status ? projectHealthTone(status) : "neutral"
    const showPublishCooldown =
        Boolean(status?.autoPublish) && publishCooldownSec > 0

    return (
        <AppShell
            title={status?.notionDataSourceTitle ?? "Project"}
            backTo={{ label: "Projects", href: ROUTES.home }}
            email={auth?.email}
            onLogout={refresh}
            actions={
                status ? (
                    <Button onClick={() => void handleSync()} disabled={syncing || deleting}>
                        <RefreshCw
                            size={15}
                            strokeWidth={2}
                            className={syncing ? "pf-spin-icon" : undefined}
                            aria-hidden
                        />
                        {syncing ? "Syncing…" : "Sync now"}
                    </Button>
                ) : null
            }
        >
            {error ? <Banner tone="error">{error}</Banner> : null}

            {!status ? (
                <ProjectPageSkeleton />
            ) : (
                <div className="pf-stack">
                    <div className="pf-project-hero">
                        <div className="pf-project-hero-flow">
                            <NotionLogo size={18} />
                            <span className="pf-project-hero-line" aria-hidden />
                            <FramerLogo size={18} />
                        </div>
                        <div className="pf-project-hero-meta">
                            <ProjectStatusBadge status={status} />
                            {status.autoSync ? <Badge tone="neutral">Auto-sync</Badge> : null}
                            <span className={`pf-live-dot pf-live-dot--${health}`} title="Pipeline health" />
                        </div>
                    </div>

                    <div className="pf-metric-strip">
                        <div className="pf-metric">
                            <span className="pf-metric-label">
                                <Clock size={13} aria-hidden />
                                Last sync
                            </span>
                            <span className="pf-metric-value">{formatRelativeTime(status.lastSyncAt)}</span>
                        </div>
                        <div className="pf-metric">
                            <span className="pf-metric-label">
                                <Database size={13} aria-hidden />
                                Items
                            </span>
                            <span className="pf-metric-value">{status.itemsSyncedCount}</span>
                        </div>
                        <div className="pf-metric">
                            <span className="pf-metric-label">
                                <Webhook size={13} aria-hidden />
                                Webhook
                            </span>
                            <span className="pf-metric-value">
                                {webhookStatusLabel(
                                    status.webhookStatus,
                                    status.autoSync,
                                    Boolean(status.webhookVerificationToken)
                                )}
                            </span>
                        </div>
                    </div>

                    {persistedSyncError ? <Banner tone="error">{persistedSyncError}</Banner> : null}

                    {status.autoSync ? (
                        <WebhookSetupCard
                            status={status}
                            projectId={projectId}
                            onUpdated={setStatus}
                        />
                    ) : null}

                    <section className="pf-setup-section">
                        <div className="pf-setup-section-head">
                            <h3 className="pf-setup-section-title">Publish</h3>
                            <p className="pf-setup-section-desc">
                                Control when synced changes go live on your Framer site.
                            </p>
                        </div>
                        {syncFeedback ? (
                            <Banner tone={syncFeedback.tone} className="pf-banner--inset">
                                {syncFeedback.message}
                            </Banner>
                        ) : null}
                        {showPublishCooldown ? (
                            <Banner tone="info" className="pf-banner--inset">
                                {formatPublishCooldownMessage(publishCooldownSec)}
                            </Banner>
                        ) : null}
                        <ToggleRow
                            label="Auto-publish after sync"
                            description="Deploy or preview your Framer site when CMS sync completes."
                            checked={status.autoPublish}
                            disabled={savingPublish}
                            onChange={checked =>
                                void handlePublishChange(checked, status.publishMode as PublishMode)
                            }
                        />
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
                    </section>

                    <section className="pf-setup-section pf-setup-section--danger">
                        <div className="pf-setup-section-head">
                            <h3 className="pf-setup-section-title">Danger zone</h3>
                            <p className="pf-setup-section-desc">Remove this connection from NoCMS.</p>
                        </div>
                        <CheckboxRow
                            checked={deleteFramerCollection}
                            disabled={deleting}
                            onChange={setDeleteFramerCollection}
                        >
                            Also clear synced items from the Framer CMS collection
                        </CheckboxRow>
                        <p className="pf-muted pf-danger-hint">
                            Framer does not expose a delete-collection API — the empty collection may
                            still appear in your project until removed manually.
                        </p>
                        <div className="pf-card-footer">
                            <Button
                                variant="danger"
                                onClick={() => setShowDeleteModal(true)}
                                disabled={deleting}
                            >
                                <Trash2 size={15} aria-hidden />
                                Delete project
                            </Button>
                        </div>
                    </section>
                </div>
            )}

            <Modal
                open={showDeleteModal}
                title="Delete project?"
                description={
                    deleteFramerCollection
                        ? `This removes the connection and clears all items from “${collectionLabel}” in Framer.`
                        : "This removes the connection. The Framer collection stays unchanged."
                }
                confirmLabel="Delete"
                confirmVariant="danger"
                busy={deleting}
                onConfirm={() => void handleDelete()}
                onCancel={() => setShowDeleteModal(false)}
            />
        </AppShell>
    )
}
