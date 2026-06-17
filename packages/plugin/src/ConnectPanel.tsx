import { framer } from "framer-plugin"
import { useEffect, useMemo, useState } from "react"
import { ExternalLinkIcon } from "./components/ExternalLinkIcon"
import { PipelineFlow } from "./components/PipelineFlow"
import { PluginLoading } from "./components/PluginLoading"
import { DOCS_URL, WEB_APP_URL } from "./config"
import { fetchPluginConfig } from "./pluginApi"
import { PluginShell } from "./PluginShell"

function dashboardUrl(base: string, path: string): string {
    return `${base.replace(/\/$/, "")}${path}`
}

const SETUP_STEPS = [
    { title: "Connect", detail: "Link Notion or Google Sheets" },
    { title: "Map", detail: "Match fields to your collection" },
    { title: "Sync", detail: "Publish updates to your site" },
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

    const openExternal = (url: string) => {
        window.open(url, "_blank", "noopener,noreferrer")
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
            <div className="pf-home">
                <header className="pf-home-header">
                    <h1 className="pf-home-title">Content source → Framer CMS</h1>
                    <p className="pf-home-lead">
                        KnotCMS keeps your Notion database or spreadsheet in sync with Framer
                        collections — set up once on the web, then edit where you already work.
                    </p>
                </header>

                <PipelineFlow compact />

                <div className="pf-home-actions">
                    <button
                        type="button"
                        className="pf-btn pf-btn--primary pf-btn--block"
                        onClick={() => openInDashboard("/setup")}
                    >
                        Start setup
                        <ExternalLinkIcon />
                    </button>
                    <button
                        type="button"
                        className="pf-btn pf-btn--secondary pf-btn--block"
                        onClick={() => openInDashboard("/")}
                    >
                        Open dashboard
                        <ExternalLinkIcon />
                    </button>
                </div>

                <ol className="pf-home-steps" aria-label="Setup steps">
                    {SETUP_STEPS.map((step, index) => (
                        <li key={step.title} className="pf-home-step">
                            <span className="pf-home-step-index" aria-hidden>
                                {index + 1}
                            </span>
                            <span className="pf-home-step-copy">
                                <span className="pf-home-step-title">{step.title}</span>
                                <span className="pf-home-step-detail">{step.detail}</span>
                            </span>
                        </li>
                    ))}
                </ol>

                <p className="pf-home-hint">
                    Opens <span className="pf-home-hint-host">{dashboardHost}</span>
                </p>

                <p className="pf-home-docs">
                    <a
                        href={DOCS_URL}
                        className="pf-home-docs-link"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={event => {
                            event.preventDefault()
                            openExternal(DOCS_URL)
                        }}
                    >
                        Documentation
                        <ExternalLinkIcon />
                    </a>
                </p>
            </div>
        </PluginShell>
    )
}
