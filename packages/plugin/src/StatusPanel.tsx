import { framer } from "framer-plugin"
import { useCallback, useEffect, useState } from "react"
import { getProjectStatus, updatePublishSettings } from "./api"
import { formatSyncResult, syncCollectionFromWorker } from "./data"
import {
    formatRelativeTime,
    getHeroHeadline,
    getHeroMeta,
    getOverallHealth,
    truncateLabel,
    webhookLabel,
    type OverallHealth,
} from "./statusFormatters"
import { WizardShell } from "./WizardShell"
import { ApiRequestError } from "./formatApiError"
import type { ProjectStatus } from "@notion-framer/shared"

interface StatusPanelProps {
    projectId: string
    notionTitleHint: string | null
    onReconfigure: () => void
}

function Row({
    label,
    value,
    tone = "default",
}: {
    label: string
    value: string
    tone?: "default" | "ok" | "warn" | "muted"
}) {
    return (
        <div className="nf-row">
            <span className="nf-row-label">{label}</span>
            <span className={`nf-row-value nf-row-value--${tone}`} title={value}>
                {value}
            </span>
        </div>
    )
}

const healthClass: Record<OverallHealth, string> = {
    healthy: "nf-banner--ok",
    warning: "nf-banner--warn",
    error: "nf-banner--err",
    idle: "nf-banner--idle",
}

const POLL_STEADY_MS = 60_000
const POLL_WEBHOOK_SETUP_MS = 12_000

export function StatusPanel({ projectId, notionTitleHint, onReconfigure }: StatusPanelProps) {
    const [status, setStatus] = useState<ProjectStatus | null>(null)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [isSyncing, setIsSyncing] = useState(false)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [isSavingPublish, setIsSavingPublish] = useState(false)

    const refresh = useCallback(async () => {
        try {
            setLoadError(null)
            setStatus(await getProjectStatus(projectId))
        } catch (error) {
            console.error(error)
            setLoadError(error instanceof Error ? error.message : "Could not load status")
        }
    }, [projectId])

    const needsWebhookSetup = Boolean(status?.autoSync && status.webhookStatus !== "active")
    const pollIntervalMs = needsWebhookSetup ? POLL_WEBHOOK_SETUP_MS : POLL_STEADY_MS

    useEffect(() => {
        void refresh()
        const interval = window.setInterval(() => void refresh(), pollIntervalMs)
        return () => window.clearInterval(interval)
    }, [refresh, pollIntervalMs])

    const handleRefresh = async () => {
        setIsRefreshing(true)
        await refresh()
        setIsRefreshing(false)
    }

    const savePublish = async (autoPublish: boolean, publishLive: boolean) => {
        try {
            setIsSavingPublish(true)
            const updated = await updatePublishSettings(projectId, {
                autoPublish,
                publishMode: publishLive ? "deploy_live" : "preview_only",
            })
            setStatus(updated)
        } catch (error) {
            const msg = error instanceof Error ? error.message : "Could not save publish settings"
            framer.notify(msg, { variant: "error" })
            await refresh()
        } finally {
            setIsSavingPublish(false)
        }
    }

    const handleAutoPublishChange = (enabled: boolean) => {
        if (enabled) {
            void savePublish(true, true)
        } else {
            void savePublish(false, status?.publishMode === "deploy_live")
        }
    }

    const handlePublishLiveChange = (live: boolean) => {
        if (!status?.autoPublish) return
        void savePublish(true, live)
    }

    const copyVerificationToken = async () => {
        const token = status?.webhookVerificationToken
        if (!token) return
        try {
            await navigator.clipboard.writeText(token)
            framer.notify("Copied — paste in Notion → Webhooks → Verify", { variant: "success" })
        } catch {
            framer.notify("Copy failed", { variant: "warning" })
        }
    }

    const handleSync = async () => {
        try {
            setIsSyncing(true)
            const result = await syncCollectionFromWorker(projectId)
            const name =
                status?.framerCollectionName ?? status?.notionDataSourceTitle ?? notionTitleHint ?? "Notion Sync"
            framer.notify(formatSyncResult(result, name), { variant: "success" })
            await refresh()
        } catch (error) {
            const msg =
                error instanceof ApiRequestError
                    ? error.message
                    : error instanceof Error
                      ? error.message
                      : "Sync failed"
            framer.notify(msg, { variant: "error", durationMs: 10000 })
            await refresh()
        } finally {
            setIsSyncing(false)
        }
    }

    const cmsName =
        status?.framerCollectionName ?? status?.notionDataSourceTitle ?? notionTitleHint ?? "Notion database"
    const notionName = status?.notionDataSourceTitle ?? notionTitleHint ?? "Connected"

    return (
        <WizardShell variant="dashboard">
            <div className="nf-status-page framer-hide-scrollbar">
                <div className="nf-status-body">
                    {loadError && !status ? (
                        <div className={`nf-banner nf-banner--err`}>
                            <p className="nf-banner-title">Couldn’t load status</p>
                            <p className="nf-banner-meta">{loadError}</p>
                        </div>
                    ) : !status ? (
                        <div className="nf-banner nf-banner--idle">
                            <div className="framer-spinner" />
                        </div>
                    ) : (
                        <>
                            <section className="nf-section-panel">
                                <h2 className="nf-title nf-section-panel-title--lg">Dashboard</h2>
                                <p className="nf-route-line">
                                    <span>{truncateLabel(notionName, 32)}</span>
                                    <span className="nf-route-arrow" aria-hidden>
                                        →
                                    </span>
                                    <span>{truncateLabel(cmsName, 32)}</span>
                                </p>
                                <div className={`nf-banner ${healthClass[getOverallHealth(status)]}`}>
                                    <p className="nf-banner-title">{getHeroHeadline(status)}</p>
                                    <p className="nf-banner-meta">{getHeroMeta(status, cmsName)}</p>
                                </div>
                                <p className="nf-note nf-note--inset">
                                    Pages sync to <strong>{truncateLabel(cmsName, 36)}</strong> in Framer CMS — not
                                    this plugin slot.
                                </p>
                            </section>

                            <section className="nf-section-panel nf-section-panel--flush">
                                <h3 className="nf-section-panel-title">Status</h3>
                                <div className="nf-card nf-card--divide">
                                    <Row label="Notion" value={truncateLabel(notionName, 32)} tone="ok" />
                                    <Row
                                        label="Last sync"
                                        value={formatRelativeTime(status.lastSyncAt)}
                                        tone={status.lastSyncAt ? "ok" : "muted"}
                                    />
                                    <Row
                                        label="Webhook"
                                        value={webhookLabel(status.webhookStatus, status.autoSync)}
                                        tone={
                                            !status.autoSync
                                                ? "muted"
                                                : status.webhookStatus === "active"
                                                  ? "ok"
                                                  : "warn"
                                        }
                                    />
                                    {status.licenseStatus !== "active" && (
                                        <Row label="License" value="Inactive" tone="warn" />
                                    )}
                                </div>
                            </section>

                            {status.webhookVerificationToken && (
                                <section className="nf-section-panel">
                                    <h3 className="nf-section-panel-title">Webhook token</h3>
                                    <p className="nf-section-panel-desc">
                                        Notion → Integration → Webhooks → Verify
                                    </p>
                                    <div className="nf-token-box">{status.webhookVerificationToken}</div>
                                    <button
                                        type="button"
                                        className="nf-btn nf-btn--secondary"
                                        onClick={() => void copyVerificationToken()}
                                    >
                                        Copy token
                                    </button>
                                </section>
                            )}

                            <section className="nf-section-panel">
                                <h3 className="nf-section-panel-title">Publishing</h3>
                                <div className="nf-section-panel-body">
                                    <label className="nf-check-row">
                                        <input
                                            type="checkbox"
                                            checked={status.autoPublish}
                                            disabled={isSavingPublish}
                                            onChange={e => handleAutoPublishChange(e.target.checked)}
                                        />
                                        <span>Auto-publish after sync</span>
                                    </label>
                                    {status.autoPublish && (
                                        <label className="nf-check-row nf-check-row--nested">
                                            <input
                                                type="checkbox"
                                                checked={status.publishMode === "deploy_live"}
                                                disabled={isSavingPublish}
                                                onChange={e => handlePublishLiveChange(e.target.checked)}
                                            />
                                            <span>Publish to live site</span>
                                        </label>
                                    )}
                                </div>
                            </section>
                        </>
                    )}
                </div>

                <footer className="nf-status-footer">
                    <div className="nf-btn-row">
                        <button
                            type="button"
                            className="nf-btn nf-btn--primary"
                            onClick={handleSync}
                            disabled={isSyncing || !status}
                        >
                            {isSyncing ? <div className="framer-spinner" /> : "Sync now"}
                        </button>
                        <button
                            type="button"
                            className="nf-btn nf-btn--secondary"
                            onClick={() => void handleRefresh()}
                            disabled={isRefreshing || isSyncing}
                        >
                            {isRefreshing ? <div className="framer-spinner" /> : "Refresh"}
                        </button>
                    </div>
                    <button type="button" className="nf-link-btn" onClick={onReconfigure}>
                        Reconfigure
                    </button>
                </footer>
            </div>
        </WizardShell>
    )
}
