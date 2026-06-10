import { framer } from "framer-plugin"
import { useEffect, useState } from "react"
import { WEB_APP_URL } from "./config"
import { fetchPluginConfig } from "./pluginApi"
import { PluginShell } from "./PluginShell"

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
        return <div className="pf-loading">Loading…</div>
    }

    const openDashboard = () => {
        const url = `${webAppUrl.replace(/\/$/, "")}/setup`
        window.open(url, "_blank", "noopener,noreferrer")
    }

    return (
        <PluginShell
            title="NoCMS"
            subtitle="Connect Notion and manage sync from the dashboard."
            footer={
                <>
                    <button
                        type="button"
                        className="pf-btn pf-btn--primary pf-btn--block"
                        onClick={openDashboard}
                    >
                        Open dashboard
                    </button>
                    <button
                        type="button"
                        className="pf-btn pf-btn--ghost pf-btn--block"
                        onClick={() => framer.closePlugin()}
                    >
                        Close
                    </button>
                </>
            }
        >
            <p className="pf-muted">
                Sign in, connect Notion, map fields, and add your Framer Server API key.
            </p>
        </PluginShell>
    )
}
