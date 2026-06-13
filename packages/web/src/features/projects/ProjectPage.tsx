import type { PublishMode, SyncResult } from "@knotcms/shared"
import { RefreshCw, Trash2 } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom"
import { useAuthContext } from "../../app/AuthContext"
import { ROUTES } from "../../constants/routes"
import {
    deleteDashboardProject,
    fetchDashboardProject,
    importDashboardFramerRows,
    triggerDashboardSync,
    updateDashboardAutomationSettings,
    updateDashboardPublishSettings,
} from "../../lib/api"
import { ApiError } from "../../lib/api/client"
import { isPlanLimitError, planLimitUpgradeHref } from "../../lib/plan-errors"
import { PlanUsageBanner } from "../auth/PlanUsageBanner"
import { SubscriptionCancelBanner } from "../auth/SubscriptionCancelBanner"
import { usePublishCooldownRemaining } from "../../lib/publish-cooldown"
import { formatSyncFeedback, type SyncFeedbackTone } from "../../lib/sync"
import { AppShell } from "../../components/layout"
import {
    Banner,
    Button,
    Field,
    Input,
    Modal,
    Skeleton,
    buttonClass,
    useToast,
} from "../../components/ui"
import { ProjectActivityMetrics } from "./ProjectActivityMetrics"
import { ProjectConnectionBindings } from "./ProjectConnectionBindings"
import { ProjectStatusStrip } from "./ProjectStatusStrip"
import { ProjectSyncSettingsPanel } from "./ProjectSyncSettingsPanel"

function ProjectPageSkeleton() {
    return (
        <div className="pf-project-dashboard">
            <Skeleton height={140} className="pf-skeleton--block" />
            <Skeleton height={240} className="pf-skeleton--block" />
            <Skeleton height={360} className="pf-skeleton--block" />
        </div>
    )
}

export function ProjectPage() {
    const { projectId } = useParams<{ projectId: string }>()
    const navigate = useNavigate()
    const [searchParams, setSearchParams] = useSearchParams()
    const {
        auth,
        refresh,
        canSync,
        canUseProjectFeatures,
        isOverProjectLimit,
        hasAutoSync,
        hasAutoPublish,
        usage,
    } = useAuthContext()
    const { toast } = useToast()
    const [status, setStatus] = useState<Awaited<ReturnType<typeof fetchDashboardProject>> | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [syncing, setSyncing] = useState(false)
    const [checkingStatus, setCheckingStatus] = useState(false)
    const [savingPublish, setSavingPublish] = useState(false)
    const [savingAutomation, setSavingAutomation] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [syncFeedback, setSyncFeedback] = useState<{ tone: SyncFeedbackTone; message: string } | null>(
        null
    )
    const [importing, setImporting] = useState(false)
    const [importCollectionId, setImportCollectionId] = useState("")
    const [importFeedback, setImportFeedback] = useState<string | null>(null)
    const [planLimitHref, setPlanLimitHref] = useState<string | null>(null)
    const [showUpdatedBanner, setShowUpdatedBanner] = useState(
        searchParams.get("updated") === "connection"
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

    useEffect(() => {
        if (searchParams.get("updated") !== "connection") return
        setShowUpdatedBanner(true)
        const next = new URLSearchParams(searchParams)
        next.delete("updated")
        setSearchParams(next, { replace: true })
    }, [searchParams, setSearchParams])

    const handleCheckStatus = async () => {
        setCheckingStatus(true)
        try {
            await load()
        } finally {
            setCheckingStatus(false)
        }
    }

    const handleSync = async () => {
        if (!projectId) return
        setSyncing(true)
        setError(null)
        setSyncFeedback(null)
        setPlanLimitHref(null)
        try {
            const result: SyncResult = await triggerDashboardSync(projectId)
            const feedback = formatSyncFeedback(result)
            setSyncFeedback(feedback)
            toast(feedback.message, feedback.tone === "success" ? "success" : "info")
            await load()
            await refresh()
        } catch (err) {
            const message =
                err instanceof ApiError ? err.message : "Sync failed. Try again in a moment."
            setError(message)
            if (err instanceof ApiError && isPlanLimitError(err)) {
                setPlanLimitHref(planLimitUpgradeHref(err))
            }
            toast(message, "error")
        } finally {
            setSyncing(false)
        }
    }

    const handleImportFramer = async () => {
        if (!projectId) return
        setImporting(true)
        setError(null)
        setImportFeedback(null)
        setPlanLimitHref(null)
        try {
            const result = await importDashboardFramerRows(projectId, {
                framerCollectionId: importCollectionId.trim() || undefined,
            })
            const parts = [
                result.imported > 0
                    ? `Imported ${result.imported} row${result.imported === 1 ? "" : "s"} from Framer into Notion.`
                    : "No new rows were imported from Framer.",
            ]
            if (result.skipped > 0) {
                parts.push(`${result.skipped} row${result.skipped === 1 ? "" : "s"} skipped.`)
            }
            const message = parts.join(" ")
            setImportFeedback(message)
            if (result.warnings.length > 0) {
                setImportFeedback(`${message} ${result.warnings[0]}`)
            }
            toast(message, result.imported > 0 ? "success" : "info")
            await load()
        } catch (err) {
            const message =
                err instanceof ApiError
                    ? err.message
                    : "Could not import from Framer. Try again in a moment."
            setError(message)
            toast(message, "error")
        } finally {
            setImporting(false)
        }
    }

    const handleDelete = async () => {
        if (!projectId) return

        setDeleting(true)
        setError(null)
        try {
            await deleteDashboardProject(projectId)
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

    const handleAutoSyncChange = async (autoSync: boolean) => {
        if (!projectId) return
        setSavingAutomation(true)
        try {
            setStatus(await updateDashboardAutomationSettings(projectId, { autoSync }))
            toast(autoSync ? "Auto-sync enabled" : "Auto-sync disabled", "success")
        } catch (err) {
            const message =
                err instanceof ApiError ? err.message : "Could not save automation settings"
            setError(message)
            if (err instanceof ApiError && isPlanLimitError(err)) {
                setPlanLimitHref(planLimitUpgradeHref(err))
            }
            toast(message, "error")
        } finally {
            setSavingAutomation(false)
        }
    }

    const handlePublishChange = async (autoPublish: boolean, publishMode: PublishMode) => {
        if (!projectId) return
        setSavingPublish(true)
        try {
            setStatus(await updateDashboardPublishSettings(projectId, { autoPublish, publishMode }))
            toast("Publish settings saved", "success")
        } catch (err) {
            const message =
                err instanceof ApiError ? err.message : "Could not save publish settings"
            setError(message)
            if (err instanceof ApiError && isPlanLimitError(err)) {
                setPlanLimitHref(planLimitUpgradeHref(err))
            }
            toast(message, "error")
        } finally {
            setSavingPublish(false)
        }
    }

    if (!projectId) {
        return <p className="pf-muted">Missing project id</p>
    }

    const pageTitle = status?.notionDataSourceTitle ?? "Sync connection"

    return (
        <AppShell
            title={pageTitle}
            subtitle="Sync connection overview"
            backTo={{ label: "Projects", href: ROUTES.home }}
            actions={
                status ? (
                    <>
                        <Button
                            variant="secondary"
                            onClick={() => void handleCheckStatus()}
                            disabled={checkingStatus || syncing || deleting}
                        >
                            <RefreshCw
                                size={15}
                                strokeWidth={2}
                                className={checkingStatus ? "pf-spin-icon" : undefined}
                                aria-hidden
                            />
                            {checkingStatus ? "Refreshing…" : "Refresh"}
                        </Button>
                        {canSync ? (
                            <Button
                                onClick={() => void handleSync()}
                                disabled={syncing || checkingStatus || deleting}
                            >
                                <RefreshCw
                                    size={15}
                                    strokeWidth={2}
                                    className={syncing ? "pf-spin-icon" : undefined}
                                    aria-hidden
                                />
                                {syncing ? "Syncing…" : "Sync now"}
                            </Button>
                        ) : !isOverProjectLimit ? (
                            <Link className={buttonClass("secondary")} to={ROUTES.plans}>
                                View plans
                            </Link>
                        ) : null}
                    </>
                ) : null
            }
        >
            {auth ? <SubscriptionCancelBanner auth={auth} /> : null}
            <PlanUsageBanner usage={usage} hideProjectLink />

            {error ? (
                <Banner tone="error">
                    {error}
                    {planLimitHref ? (
                        <>
                            {" "}
                            <a href={planLimitHref} className="pf-banner-link">
                                Upgrade plan
                            </a>
                        </>
                    ) : null}
                </Banner>
            ) : null}

            {!status ? (
                <ProjectPageSkeleton />
            ) : (
                <div className="pf-project-dashboard">
                    {showUpdatedBanner ? (
                        <Banner tone="success" className="pf-banner--flush">
                            Connection updated. Your new Notion database and field mapping are saved.
                            Run Sync now to push the latest content to Framer.
                        </Banner>
                    ) : null}

                    <div className="pf-project-overview-stack">
                        <ProjectStatusStrip status={status} />
                        <ProjectActivityMetrics status={status} />
                    </div>

                    <section className="pf-project-section" aria-labelledby="project-connection-heading">
                        <h2 id="project-connection-heading" className="pf-project-section-label">
                            Connection
                        </h2>
                        <ProjectConnectionBindings status={status} projectId={projectId} />
                    </section>

                    <section className="pf-project-section" aria-labelledby="project-sync-heading">
                        <div className="pf-project-section-intro">
                            <h2 id="project-sync-heading" className="pf-project-section-label">
                                Sync behavior
                            </h2>
                            <p className="pf-project-section-desc">
                                Auto-sync, webhooks, and publishing for this connection.
                            </p>
                        </div>
                        <ProjectSyncSettingsPanel
                            status={status}
                            projectId={projectId}
                            savingAutomation={savingAutomation}
                            savingPublish={savingPublish}
                            canUseProjectFeatures={canUseProjectFeatures}
                            hasAutoSync={hasAutoSync}
                            hasAutoPublish={hasAutoPublish}
                            isOverProjectLimit={isOverProjectLimit}
                            publishCooldownSec={publishCooldownSec}
                            syncFeedback={syncFeedback}
                            onAutoSyncChange={autoSync => void handleAutoSyncChange(autoSync)}
                            onPublishChange={(autoPublish, publishMode) =>
                                void handlePublishChange(autoPublish, publishMode)
                            }
                            onWebhookUpdated={setStatus}
                            onRefresh={load}
                        />
                    </section>

                    <section className="pf-project-section" aria-labelledby="project-tools-heading">
                        <h2 id="project-tools-heading" className="pf-project-section-label">
                            Tools
                        </h2>
                        <details className="pf-project-details">
                            <summary className="pf-project-details-summary">
                                Import rows from Framer into Notion
                            </summary>
                            <div className="pf-project-details-body">
                                <p className="pf-muted">
                                    One-time pull from a Framer CMS collection into your linked Notion
                                    database. Existing Notion rows with the same slug are skipped.
                                </p>
                                {importFeedback ? (
                                    <Banner tone="info" className="pf-banner--inset">
                                        {importFeedback}
                                    </Banner>
                                ) : null}
                                <Field
                                    label="Framer collection ID (optional)"
                                    htmlFor="import-framer-collection-id"
                                >
                                    <Input
                                        id="import-framer-collection-id"
                                        value={importCollectionId}
                                        disabled={importing || !canUseProjectFeatures}
                                        placeholder="Only needed for separate KnotCMS collections"
                                        onChange={e => setImportCollectionId(e.target.value)}
                                    />
                                </Field>
                                <Button
                                    variant="secondary"
                                    onClick={() => void handleImportFramer()}
                                    disabled={
                                        importing || syncing || deleting || !canUseProjectFeatures
                                    }
                                >
                                    {importing ? "Importing…" : "Import from Framer"}
                                </Button>
                            </div>
                        </details>
                    </section>

                    <section
                        className="pf-project-section pf-project-section--danger"
                        aria-labelledby="project-danger-heading"
                    >
                        <h2 id="project-danger-heading" className="pf-project-section-label">
                            Remove
                        </h2>
                        <div className="pf-data-panel pf-project-danger-panel">
                            <div className="pf-project-danger-copy">
                                <p className="pf-project-panel-title">Delete this connection</p>
                                <p className="pf-project-panel-desc">
                                    Stops syncing in KnotCMS. Your Framer CMS collection is unchanged —
                                    remove it in Framer if you no longer need it.
                                </p>
                            </div>
                            <Button
                                variant="danger"
                                onClick={() => setShowDeleteModal(true)}
                                disabled={deleting}
                            >
                                <Trash2 size={15} aria-hidden />
                                Delete connection
                            </Button>
                        </div>
                    </section>
                </div>
            )}

            <Modal
                open={showDeleteModal}
                title="Delete this sync connection?"
                description="KnotCMS will stop syncing this Notion database to Framer. Your Framer CMS collection is not deleted."
                confirmLabel="Delete connection"
                confirmVariant="danger"
                busy={deleting}
                onConfirm={() => void handleDelete()}
                onCancel={() => setShowDeleteModal(false)}
            />
        </AppShell>
    )
}
