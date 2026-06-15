import { framer } from "framer-plugin"
import { useEffect, useMemo, useState } from "react"
import { ExternalLinkIcon } from "./components/ExternalLinkIcon"
import { PipelineFlow } from "./components/PipelineFlow"
import { PluginLoading } from "./components/PluginLoading"
import { WEB_APP_URL } from "./config"
import { fetchPluginConfig } from "./pluginApi"
import { PluginShell } from "./PluginShell"

function dashboardUrl(base: string, path: string): string {
    return `${base.replace(/\/$/, "")}${path}`
}

const WEB_FEATURES = [
    "Connect Notion or Google Sheets",
    "Map fields to Framer CMS collections",
    "Sync manually or turn on auto-sync",
] as const

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

    const dashboardHost = useMemo(() => {
        try {
            return new URL(webAppUrl).host
        } catch {
            return "app.knotcms.com"
        }
    }, [webAppUrl])

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
            <section className="pf-connector-hero" aria-labelledby="pf-connector-heading">
                <div className="pf-connector-pipeline" aria-hidden>
                    <PipelineFlow />
                </div>

                <div className="pf-connector-actions">
                    <button
                        type="button"
                        className="pf-btn pf-btn--primary pf-btn--block"
                        onClick={() => openInDashboard("/setup")}
                    >
                        New project
                        <ExternalLinkIcon />
                    </button>
                    <button
                        type="button"
                        className="pf-btn pf-btn--secondary pf-btn--block"
                        onClick={() => openInDashboard("/")}
                    >
                        All projects
                        <ExternalLinkIcon />
                    </button>
                </div>
            </section>

            <section className="pf-connector-body" aria-labelledby="pf-connector-heading">
                <header className="pf-connector-intro">
                    <p className="pf-eyebrow">Canvas connector</p>
                    <h1 id="pf-connector-heading" className="pf-connector-title">
                        Set up sync on the web
                    </h1>
                    <p className="pf-connector-desc">
                        KnotCMS links your content source to Framer CMS. Everything below runs in
                        your browser — this panel is a quick launcher.
                    </p>
                </header>

                <div className="pf-connector-panel">
                    <h2 className="pf-connector-panel-label">On the dashboard</h2>
                    <ul className="pf-connector-list">
                        {WEB_FEATURES.map(feature => (
                            <li key={feature}>{feature}</li>
                        ))}
                    </ul>
                </div>

                <p className="pf-connector-footnote">
                    Opens <strong>{dashboardHost}</strong> in a new tab
                </p>
            </section>
        </PluginShell>
    )
}
