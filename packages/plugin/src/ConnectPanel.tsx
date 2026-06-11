import { framer } from "framer-plugin"
import { useEffect, useState } from "react"
import { ExternalLinkIcon } from "./components/ExternalLinkIcon"
import { PipelineFlow } from "./components/PipelineFlow"
import { PluginLoading } from "./components/PluginLoading"
import { WEB_APP_URL } from "./config"
import { fetchPluginConfig } from "./pluginApi"
import { PluginShell } from "./PluginShell"

const SETUP_STEPS = [
    "Sign in with Google in the dashboard",
    "Connect your Notion database",
    "Map fields and add your Framer Server API key",
    "Sync — changes can flow automatically",
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

    if (loading) {
        return <PluginLoading />
    }

    const openDashboard = () => {
        const url = `${webAppUrl.replace(/\/$/, "")}/setup`
        window.open(url, "_blank", "noopener,noreferrer")
    }

    return (
        <PluginShell
            footer={
                <>
                    <button
                        type="button"
                        className="pf-btn pf-btn--primary pf-btn--block"
                        onClick={openDashboard}
                    >
                        Open dashboard
                        <ExternalLinkIcon />
                    </button>
                    <button
                        type="button"
                        className="pf-btn pf-btn--text"
                        onClick={() => framer.closePlugin()}
                    >
                        Close
                    </button>
                </>
            }
        >
            <div className="pf-plugin-hero">
                <PipelineFlow />
                <h1 className="pf-plugin-headline">Notion → Framer CMS</h1>
                <p className="pf-plugin-lead">
                    Keep Framer collections in sync with Notion. Setup and sync run in the web
                    dashboard — this plugin is your shortcut from the canvas.
                </p>
            </div>

            <div className="pf-plugin-steps-card">
                <p className="pf-plugin-steps-label">Quick start</p>
                <ol className="pf-plugin-steps">
                    {SETUP_STEPS.map((step, index) => (
                        <li key={step}>
                            <span className="pf-plugin-step-num">{index + 1}</span>
                            <span>{step}</span>
                        </li>
                    ))}
                </ol>
            </div>
        </PluginShell>
    )
}
