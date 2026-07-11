import type { PublishMode, SyncResult } from "@knotcms/shared"
import { RefreshCw } from "lucide-react"
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
import { apiErrorMessage, isRateLimitError, messageBannerTone, notifyApiError } from "../../lib/api-errors"
import { isPlanLimitError, planLimitUpgradeHref } from "../../lib/plan-errors"
import { PlanUsageBanner } from "../auth/PlanUsageBanner"
import { SubscriptionCancelBanner } from "../auth/SubscriptionCancelBanner"
import { usePublishCooldownRemaining } from "../../lib/publish-cooldown"
import { formatPublishSkipBanner, isPublishCooldownSkipReason, formatSyncFeedback, type SyncFeedbackTone } from "../../lib/sync"
import { projectSourcePlugin } from "../../lib/source-provider"
import { AppShell } from "../../components/layout"
import {
    Banner,
    Button,
    Modal,
    Skeleton,
    buttonClass,
    useToast,
} from "../../components/ui"
import { ProjectOverviewPanel } from "./ProjectOverviewPanel"
import { ProjectPageTabs, type ProjectPageTab } from "./ProjectPageTabs"
import { ProjectSettingsPanel } from "./ProjectSettingsPanel"

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
    const [errorTone, setErrorTone] = useState<"error" | "info">("error")
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
            const message = apiErrorMessage(err, "Could not load project")
            setError(message)
            setErrorTone(messageBannerTone(message))
            if (isRateLimitError(err)) {
                toast(message, "info")
            }
        }
    }, [projectId, toast])

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

    const setPageError = (err: unknown, fallback: string) => {
        const message = apiErrorMessage(err, fallback)
        setError(message)
        setErrorTone(isRateLimitError(err) ? "info" : "error")
        return message
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
            const message = setPageError(err, "Sync failed. Try again in a moment.")
            if (err instanceof ApiError && isPlanLimitError(err)) {
                setPlanLimitHref(planLimitUpgradeHref(err))
            }
            notifyApiError(toast, err, message)
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
            const message = setPageError(err, "Could not import from Framer. Try again in a moment.")
            notifyApiError(toast, err, message)
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
            const message = setPageError(err, "Could not delete project. Try again in a moment.")
            notifyApiError(toast, err, message)
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
            const message = setPageError(err, "Could not save automation settings")
            if (err instanceof ApiError && isPlanLimitError(err)) {
                setPlanLimitHref(planLimitUpgradeHref(err))
            }
            notifyApiError(toast, err, message)
        } finally {
            setSavingAutomation(false)
        }
    }

    const handlePublishChange = async (autoPublish: boolean, publishMode: PublishMode) => {
        if (!projectId) return
        const wasAutoPublish = status?.autoPublish ?? false
        setSavingPublish(true)
        setSyncFeedback(null)
        try {
            const updated = await updateDashboardPublishSettings(projectId, { autoPublish, publishMode })
            setStatus(updated)
            if (autoPublish && !wasAutoPublish) {
                if (updated.publishPending) {
                    toast("Auto-publish enabled — CMS will sync and deploy after edits settle", "success")
                } else if (
                    updated.lastPublishSkipReason &&
                    !isPublishCooldownSkipReason(updated.lastPublishSkipReason)
                ) {
                    toast(formatPublishSkipBanner(updated.lastPublishSkipReason), "info")
                } else if (updated.lastError) {
                    toast("Auto-publish enabled, but sync failed. Try Sync now.", "info")
                } else {
                    toast("Auto-publish enabled — site synced and published", "success")
                }
            } else {
                toast("Publish settings saved", "success")
            }
        } catch (err) {
            const message = setPageError(err, "Could not save publish settings")
            if (err instanceof ApiError && isPlanLimitError(err)) {
                setPlanLimitHref(planLimitUpgradeHref(err))
            }
            notifyApiError(toast, err, message)
        } finally {
            setSavingPublish(false)
        }
    }

    if (!projectId) {
        return <p className="pf-muted">Missing project id</p>
    }

    const pageTitle = status?.notionDataSourceTitle ?? "Sync connection"
    const sourcePlugin = status ? projectSourcePlugin(status) : null
    const isNotionProject = status?.sourceProvider !== "google_sheets"
    const activeTab: ProjectPageTab =
        searchParams.get("tab") === "settings" ? "settings" : "overview"
    const pageSubtitle =
        activeTab === "settings"
            ? "Automation, webhooks, and advanced options"
            : "Connection health and sync direction"

    const setActiveTab = (tab: ProjectPageTab) => {
        const next = new URLSearchParams(searchParams)
        if (tab === "overview") next.delete("tab")
        else next.set("tab", tab)
        setSearchParams(next, { replace: true })
    }

    return (
        <AppShell
            title={pageTitle}
            subtitle={pageSubtitle}
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
                <Banner tone={errorTone}>
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
                            Connection updated. Your new {sourcePlugin?.sourceItemLabel.toLowerCase() ?? "source"}{" "}
                            and field mapping are saved. Run Sync now to push the latest content to Framer.
                        </Banner>
                    ) : null}

                    <ProjectPageTabs active={activeTab} onChange={setActiveTab} />

                    {activeTab === "overview" ? (
                        <ProjectOverviewPanel status={status} projectId={projectId} />
                    ) : (
                        <ProjectSettingsPanel
                            status={status}
                            projectId={projectId}
                            isNotionProject={isNotionProject}
                            savingAutomation={savingAutomation}
                            savingPublish={savingPublish}
                            canUseProjectFeatures={canUseProjectFeatures}
                            hasAutoSync={hasAutoSync}
                            hasAutoPublish={hasAutoPublish}
                            isOverProjectLimit={isOverProjectLimit}
                            publishCooldownSec={publishCooldownSec}
                            syncFeedback={syncFeedback}
                            importing={importing}
                            syncing={syncing}
                            deleting={deleting}
                            importCollectionId={importCollectionId}
                            importFeedback={importFeedback}
                            onAutoSyncChange={autoSync => void handleAutoSyncChange(autoSync)}
                            onPublishChange={(autoPublish, publishMode) =>
                                void handlePublishChange(autoPublish, publishMode)
                            }
                            onWebhookUpdated={setStatus}
                            onRefresh={load}
                            onImportCollectionIdChange={setImportCollectionId}
                            onImportFramer={() => void handleImportFramer()}
                            onDelete={() => setShowDeleteModal(true)}
                        />
                    )}
                </div>
            )}

            <Modal
                open={showDeleteModal}
                title="Delete this sync connection?"
                description={`KnotCMS will stop syncing this ${sourcePlugin?.sourceItemLabel.toLowerCase() ?? "source"} to Framer. Your Framer CMS collection is not deleted.`}
                confirmLabel="Delete connection"
                confirmVariant="danger"
                busy={deleting}
                onConfirm={() => void handleDelete()}
                onCancel={() => setShowDeleteModal(false)}
            />
        </AppShell>
    )
}
