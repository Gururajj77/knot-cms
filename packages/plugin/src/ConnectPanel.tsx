import { framer } from "framer-plugin"
import { useEffect, useState } from "react"
import { ExternalLinkIcon } from "./components/ExternalLinkIcon"
import { PipelineFlow } from "./components/PipelineFlow"
import { PluginLoading } from "./components/PluginLoading"
import { WEB_APP_URL } from "./config"
import { fetchPluginConfig } from "./pluginApi"
import { PluginShell } from "./PluginShell"

function dashboardUrl(base: string, path: string): string {
    return `${base.replace(/\/$/, "")}${path}`
}

export function ConnectPanel() {
    const [webAppUrl, setWebAppUrl] = useState(WEB_APP_URL)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        void fetchPluginConfig()
            .then(config => setWebAppUrl(config.webAppUrl))
            .catch(() => {
                // Fall back to build-time WEB_APP_URL
            })
            .finally(() => setLoading(false))
    }, [])

    if (loading) {
        return <PluginLoading />
    }

    const openInDashboard = (path: string) => {
        window.open(dashboardUrl(webAppUrl, path), "_blank", "noopener,noreferrer")
    }

    return (
        <PluginShell
            footer={
                <button
                    type="button"
                    className="pf-btn pf-btn--text"
                    onClick={() => framer.closePlugin()}
                >
                    Close
                </button>
            }
        >
            <header className="pf-plugin-intro">
                <p className="pf-eyebrow">Canvas connector</p>
                <h1 className="pf-plugin-title">Open the dashboard</h1>
                <p className="pf-plugin-desc">
                    Setup and sync run on the web — use the buttons below.
                </p>
            </header>

            <div className="pf-plugin-actions">
                <button
                    type="button"
                    className="pf-btn pf-btn--primary"
                    onClick={() => openInDashboard("/setup")}
                >
                    New project
                    <ExternalLinkIcon />
                </button>
                <button
                    type="button"
                    className="pf-btn pf-btn--secondary"
                    onClick={() => openInDashboard("/")}
                >
                    Projects
                    <ExternalLinkIcon />
                </button>
            </div>

            <div className="pf-plugin-status-strip pf-plugin-status-strip--ok" role="status">
                <PipelineFlow />
                <div className="pf-plugin-status-strip-copy">
                    <p className="pf-plugin-status-strip-title">
                        <span className="pf-live-dot pf-live-dot--ok" aria-hidden />
                        Notion → Framer CMS
                    </p>
                    <p className="pf-plugin-status-strip-detail">
                        Mapping, auto-sync, and publish live in the dashboard.
                    </p>
                </div>
            </div>
        </PluginShell>
    )
}
