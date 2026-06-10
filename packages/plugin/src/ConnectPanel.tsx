import { framerProjectUrlErrorMessage, isAllowedFramerProjectUrl } from "@notion-framer/shared"
import { framer } from "framer-plugin"
import { useEffect, useState } from "react"
import type { ManagedCollection } from "framer-plugin"
import { WEB_APP_URL } from "./config"
import { fetchPluginConfig, lookupPluginLink } from "./pluginApi"
import {
    clearPluginConnection,
    openDashboardUrl,
    readPluginConnection,
    savePluginConnection,
    type SavedPluginConnection,
} from "./pluginData"
import { PluginShell } from "./PluginShell"

interface ConnectPanelProps {
    collection: ManagedCollection
    syncMode?: boolean
}

function formatRelativeTime(iso: string | null): string {
    if (!iso) return "Never"
    const diff = Date.now() - new Date(iso).getTime()
    if (diff < 60_000) return "Just now"
    const min = Math.floor(diff / 60_000)
    if (min < 60) return `${min}m ago`
    const hours = Math.floor(min / 60)
    if (hours < 48) return `${hours}h ago`
    return new Date(iso).toLocaleDateString()
}

export function ConnectPanel({ collection, syncMode = false }: ConnectPanelProps) {
    const [webAppUrl, setWebAppUrl] = useState(WEB_APP_URL)
    const [framerProjectUrl, setFramerProjectUrl] = useState("")
    const [connection, setConnection] = useState<SavedPluginConnection | null>(null)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        void (async () => {
            try {
                const config = await fetchPluginConfig()
                setWebAppUrl(config.webAppUrl)
            } catch {
                // Fall back to build-time WEB_APP_URL
            }

            const saved = await readPluginConnection(collection)
            if (saved) {
                setConnection(saved)
                setFramerProjectUrl(saved.framerProjectUrl)
            }
        })().finally(() => setLoading(false))
    }, [collection])

    const setupPath = framerProjectUrl.trim()
        ? `/setup?framer_url=${encodeURIComponent(framerProjectUrl.trim())}`
        : "/setup"

    const handleOpenDashboard = () => {
        openDashboardUrl(setupPath, webAppUrl)
    }

    const handleLinkProject = async () => {
        const url = framerProjectUrl.trim()
        if (!url) {
            setError("Paste your Framer project URL first.")
            return
        }
        if (!isAllowedFramerProjectUrl(url)) {
            setError(framerProjectUrlErrorMessage())
            return
        }

        setBusy(true)
        setError(null)
        try {
            const result = await lookupPluginLink(url)
            if (!result.linked) {
                setError(
                    "No PublishFlow project found for this URL yet. Finish setup in the dashboard, then link again."
                )
                return
            }

            const saved: SavedPluginConnection = {
                projectId: result.projectId,
                framerProjectUrl: url.replace(/\/$/, ""),
                notionDataSourceTitle: result.notionDataSourceTitle,
                framerCollectionName: result.framerCollectionName,
                lastSyncAt: result.lastSyncAt,
            }
            await savePluginConnection(collection, saved)
            setConnection(saved)
            framer.notify("Connected to PublishFlow", { variant: "success" })
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not link project")
        } finally {
            setBusy(false)
        }
    }

    const handleDisconnect = async () => {
        setBusy(true)
        setError(null)
        try {
            await clearPluginConnection(collection)
            setConnection(null)
            framer.notify("Disconnected on this device", { variant: "info" })
        } finally {
            setBusy(false)
        }
    }

    if (loading) {
        return (
            <PluginShell>
                <p className="nf-desc nf-page-body">Loading…</p>
            </PluginShell>
        )
    }

    if (syncMode) {
        return (
            <PluginShell badge={connection ? "Connected" : undefined}>
                <div className="nf-page">
                    <div className="nf-page-body">
                        <h2 className="nf-title">Automatic sync</h2>
                        <p className="nf-desc">
                            PublishFlow syncs from Notion in the background when content changes. You do not
                            need to open this plugin to sync.
                        </p>
                        {connection ? (
                            <div className="nf-note nf-note--inset">
                                <p className="nf-feature-title">
                                    {connection.notionDataSourceTitle ?? "Notion database"}
                                </p>
                                <p className="nf-muted">
                                    Last sync: {formatRelativeTime(connection.lastSyncAt)}
                                </p>
                            </div>
                        ) : null}
                    </div>
                    <div className="nf-page-footer">
                        <button
                            type="button"
                            className="nf-btn nf-btn--primary"
                            onClick={() =>
                                openDashboardUrl(
                                    connection ? `/projects/${connection.projectId}` : "/",
                                    webAppUrl
                                )
                            }
                        >
                            Open dashboard
                        </button>
                        <button type="button" className="nf-link-btn" onClick={() => framer.closePlugin()}>
                            Close
                        </button>
                    </div>
                </div>
            </PluginShell>
        )
    }

    if (connection) {
        return (
            <PluginShell badge="Connected">
                <div className="nf-page">
                    <div className="nf-page-body">
                        <h2 className="nf-title">Workspace connected</h2>
                        <p className="nf-desc">
                            Publishing and field mapping happen in the PublishFlow dashboard — not in this
                            plugin.
                        </p>
                        <div className="nf-note nf-note--inset">
                            <p className="nf-feature-title">
                                {connection.notionDataSourceTitle ?? "Notion → Framer"}
                            </p>
                            <p className="nf-muted">
                                Collection: {connection.framerCollectionName ?? "—"}
                            </p>
                            <p className="nf-muted">
                                Last sync: {formatRelativeTime(connection.lastSyncAt)}
                            </p>
                        </div>
                    </div>
                    <div className="nf-page-footer">
                        <button
                            type="button"
                            className="nf-btn nf-btn--primary"
                            onClick={() =>
                                openDashboardUrl(`/projects/${connection.projectId}`, webAppUrl)
                            }
                        >
                            Open dashboard
                        </button>
                        <button
                            type="button"
                            className="nf-btn nf-btn--secondary"
                            disabled={busy}
                            onClick={() => void handleLinkProject()}
                        >
                            Refresh status
                        </button>
                        <button
                            type="button"
                            className="nf-link-btn"
                            disabled={busy}
                            onClick={() => void handleDisconnect()}
                        >
                            Disconnect
                        </button>
                    </div>
                </div>
            </PluginShell>
        )
    }

    return (
        <PluginShell>
            <div className="nf-page">
                <div className="nf-page-body">
                    <h2 className="nf-title">Connect PublishFlow</h2>
                    <p className="nf-desc">
                        Install the plugin once, then run setup in the PublishFlow dashboard — same pattern
                        as Kitful. Sync and publish stay on the web app.
                    </p>

                    <div className="nf-field">
                        <label htmlFor="framer-project-url">Framer project URL</label>
                        <input
                            id="framer-project-url"
                            className="nf-input"
                            type="url"
                            placeholder="https://framer.com/projects/…"
                            value={framerProjectUrl}
                            onChange={e => setFramerProjectUrl(e.target.value)}
                            autoComplete="off"
                        />
                        <p className="nf-field-hint">{framerProjectUrlErrorMessage()}</p>
                    </div>

                    {error ? <p className="nf-banner nf-banner--err">{error}</p> : null}

                    <ol className="nf-steps-list">
                        <li>Open the dashboard and sign in with Google.</li>
                        <li>Connect Notion, map fields, and paste your Server API key.</li>
                        <li>Return here and click Link workspace.</li>
                    </ol>
                </div>

                <div className="nf-page-footer">
                    <button
                        type="button"
                        className="nf-btn nf-btn--primary"
                        onClick={handleOpenDashboard}
                    >
                        Open dashboard
                    </button>
                    <button
                        type="button"
                        className="nf-btn nf-btn--secondary"
                        disabled={busy}
                        onClick={() => void handleLinkProject()}
                    >
                        {busy ? "Linking…" : "Link workspace"}
                    </button>
                    <button type="button" className="nf-link-btn" onClick={() => framer.closePlugin()}>
                        Not now
                    </button>
                </div>
            </div>
        </PluginShell>
    )
}
