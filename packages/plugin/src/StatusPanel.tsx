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
import type { ProjectStatus } from "@notion-framer/shared"

interface StatusPanelProps {
    projectId: string
    notionTitleHint: string | null
    onReconfigure: () => void
}

function Stat({ label, value, valueTone = "default" }: { label: string; value: string; valueTone?: "default" | "ok" | "warn" | "muted" }) {
    return (
        <div className="nf-stat">
            <span className="nf-stat-label">{label}</span>
            <span className={`nf-stat-value nf-stat-value--${valueTone}`} title={value}>
                {value}
            </span>
        </div>
    )
}

const healthClass: Record<OverallHealth, string> = {
    healthy: "nf-hero--healthy",
    warning: "nf-hero--warning",
    error: "nf-hero--error",
    idle: "nf-hero--idle",
}

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

    useEffect(() => {
        void refresh()
        const interval = window.setInterval(() => void refresh(), 30_000)
        return () => window.clearInterval(interval)
    }, [refresh])

    const needsWebhookSetup = Boolean(status?.autoSync && status.webhookStatus !== "active")

    useEffect(() => {
        if (!needsWebhookSetup) return
        const interval = window.setInterval(() => void refresh(), 5_000)
        return () => window.clearInterval(interval)
    }, [needsWebhookSetup, refresh])

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
            const msg = error instanceof Error ? error.message : "Sync failed"
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
                        <div className={`nf-hero ${healthClass.error}`}>
                            <p className="nf-hero-title-sm">Couldn’t load status</p>
                            <p className="nf-hero-meta">{loadError}</p>
                        </div>
                    ) : !status ? (
                        <div className={`nf-hero ${healthClass.idle}`}>
                            <div className="framer-spinner" />
                        </div>
                    ) : (
                        <>
                            <div>
                                <h2 className="nf-title">Dashboard</h2>
                                <p className="nf-desc">
                                    {truncateLabel(notionName, 28)} → {truncateLabel(cmsName, 28)}
                                </p>
                            </div>

                            <div className={`nf-hero ${healthClass[getOverallHealth(status)]}`}>
                                <p className="nf-hero-title-sm">{getHeroHeadline(status)}</p>
                                <p className="nf-hero-meta">{getHeroMeta(status, cmsName)}</p>
                            </div>

                            <p className="nf-hint">
                                Pages live in CMS <strong>{truncateLabel(cmsName, 40)}</strong> — not this plugin slot.
                            </p>

                            <div className="nf-stat-grid">
                                <Stat label="Notion" value={truncateLabel(notionName, 32)} valueTone="ok" />
                                <Stat
                                    label="Last sync"
                                    value={formatRelativeTime(status.lastSyncAt)}
                                    valueTone={status.lastSyncAt ? "ok" : "muted"}
                                />
                                <Stat
                                    label="Webhook"
                                    value={webhookLabel(status.webhookStatus, status.autoSync)}
                                    valueTone={
                                        !status.autoSync
                                            ? "muted"
                                            : status.webhookStatus === "active"
                                              ? "ok"
                                              : "warn"
                                    }
                                />
                                {status.licenseStatus !== "active" && (
                                    <Stat label="License" value="Inactive" valueTone="warn" />
                                )}
                            </div>

                            {status.webhookVerificationToken && (
                                <div className="nf-webhook-token">
                                    <p className="nf-label-caps">Webhook verification token</p>
                                    <p className="nf-webhook-token-hint">
                                        Paste in Notion → Integration → Webhooks → Verify. Expires if not used; Notion
                                        may send a new one — hit Refresh.
                                    </p>
                                    <div className="nf-webhook-token-box">{status.webhookVerificationToken}</div>
                                    <button
                                        type="button"
                                        className="nf-webhook-token-copy"
                                        onClick={() => void copyVerificationToken()}
                                    >
                                        Copy token
                                    </button>
                                </div>
                            )}

                            <div className="nf-publish-card">
                                <label className="nf-publish-row">
                                    <input
                                        type="checkbox"
                                        checked={status.autoPublish}
                                        disabled={isSavingPublish}
                                        onChange={e => handleAutoPublishChange(e.target.checked)}
                                    />
                                    <span>Auto-publish after sync</span>
                                </label>
                                {status.autoPublish && (
                                    <label className="nf-publish-row nf-publish-row--nested">
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
                        </>
                    )}
                </div>

                <footer className="nf-status-footer">
                    <div className="nf-btn-row">
                        <button type="button" className="nf-btn nf-btn--primary" onClick={handleSync} disabled={isSyncing || !status}>
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
