import { framer } from "framer-plugin"
import { ExternalLinkIcon } from "./components/ExternalLinkIcon"
import { LinkedProjectCard } from "./components/LinkedProjectCard"
import { PipelineFlow } from "./components/PipelineFlow"
import { PluginLoading } from "./components/PluginLoading"
import { StatusBadge } from "./components/StatusBadge"
import { usePluginState } from "./hooks/usePluginState"
import {
    projectDashboardUrl,
    setupUrlWithFramerProject,
    type PluginConfig,
} from "./pluginApi"
import { PluginShell } from "./PluginShell"
import { WEB_APP_URL } from "./config"

function openDashboard(url: string) {
    window.open(url, "_blank", "noopener,noreferrer")
}

function resolveConfig(config: PluginConfig | null) {
    const webAppUrl = (config?.webAppUrl ?? WEB_APP_URL).replace(/\/$/, "")
    return {
        webAppUrl,
        setupUrl: config?.setupUrl ?? `${webAppUrl}/setup`,
        homeUrl: config?.homeUrl ?? `${webAppUrl}/`,
        dashboardHost: (() => {
            try {
                return new URL(webAppUrl).host
            } catch {
                return "app.knotcms.com"
            }
        })(),
    }
}

export function ConnectPanel() {
    const { loadState, config, framerProjectUrl, framerProjectName, siteStatus, statusError } =
        usePluginState()

    if (loadState === "loading") {
        return <PluginLoading />
    }

    if (loadState === "unavailable") {
        const { setupUrl, homeUrl, dashboardHost } = resolveConfig(null)
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
                <section className="pf-connection-hero">
                    <StatusBadge tone="warning" label="Offline" />
                    <div className="pf-connection-copy">
                        <h1 className="pf-connection-title">Could not reach KnotCMS</h1>
                        <p className="pf-connection-desc">
                            Check your connection and try reopening the plugin.
                        </p>
                    </div>
                </section>
                <div className="pf-connection-actions">
                    <button
                        type="button"
                        className="pf-btn pf-btn--primary pf-btn--block"
                        onClick={() => openDashboard(setupUrl)}
                    >
                        Open dashboard
                        <ExternalLinkIcon />
                    </button>
                    <button
                        type="button"
                        className="pf-btn pf-btn--secondary pf-btn--block"
                        onClick={() => openDashboard(homeUrl)}
                    >
                        All projects
                        <ExternalLinkIcon />
                    </button>
                </div>
                <p className="pf-connection-footnote">
                    Dashboard at <strong>{dashboardHost}</strong>
                </p>
            </PluginShell>
        )
    }

    const { webAppUrl, setupUrl, homeUrl, dashboardHost } = resolveConfig(config)
    const connected = siteStatus?.connected === true
    const projects = siteStatus?.projects ?? []
    const setupHref =
        framerProjectUrl != null
            ? setupUrlWithFramerProject(setupUrl, framerProjectUrl)
            : setupUrl
    const primaryProject = projects[0] ?? null

    const statusTone = connected
        ? projects.some(project => project.lastError?.trim())
            ? "warning"
            : "connected"
        : statusError
          ? "warning"
          : "disconnected"

    const statusLabel = connected
        ? projects.some(project => project.lastError?.trim())
            ? "Connected · sync issue"
            : "Connected"
        : statusError
          ? "Status unknown"
          : "Not connected"

    const statusTitle = connected
        ? projects.length === 1
            ? "KnotCMS is linked to this site"
            : `${projects.length} KnotCMS projects on this site`
        : statusError
          ? "Could not verify connection"
          : "KnotCMS is not linked yet"

    const statusDescription = connected
        ? "Manage sync, mapping, and billing in the web dashboard."
        : statusError
          ? "You can still open the dashboard to connect or manage projects."
          : "Connect a Notion database or spreadsheet to this Framer site from the web dashboard."

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
            <section className="pf-connection-hero" aria-labelledby="pf-connection-heading">
                <div className="pf-connection-hero-top">
                    <StatusBadge tone={statusTone} label={statusLabel} />
                    {framerProjectName ? (
                        <p className="pf-connection-site-name">{framerProjectName}</p>
                    ) : null}
                </div>

                <div
                    className={[
                        "pf-connection-pipeline",
                        connected ? "pf-connection-pipeline--connected" : "",
                    ]
                        .filter(Boolean)
                        .join(" ")}
                    aria-hidden
                >
                    <PipelineFlow />
                </div>

                <div className="pf-connection-copy">
                    <h1 id="pf-connection-heading" className="pf-connection-title">
                        {statusTitle}
                    </h1>
                    <p className="pf-connection-desc">{statusDescription}</p>
                </div>

                {statusError && !connected ? (
                    <p className="pf-connection-alert" role="status">
                        {statusError}
                    </p>
                ) : null}
            </section>

            {connected ? (
                <section className="pf-connection-projects" aria-labelledby="pf-projects-heading">
                    <h2 id="pf-projects-heading" className="pf-section-label">
                        Linked projects
                    </h2>
                    <ul className="pf-linked-project-list">
                        {projects.map(project => (
                            <li key={project.id}>
                                <LinkedProjectCard project={project} />
                            </li>
                        ))}
                    </ul>
                </section>
            ) : (
                <section className="pf-connection-steps" aria-labelledby="pf-steps-heading">
                    <h2 id="pf-steps-heading" className="pf-section-label">
                        Get started
                    </h2>
                    <ol className="pf-step-list">
                        <li>Open the KnotCMS dashboard in your browser</li>
                        <li>Connect your source and map fields to Framer CMS</li>
                        <li>Return here — this plugin will show your connection status</li>
                    </ol>
                </section>
            )}

            <div className="pf-connection-actions">
                {connected && primaryProject ? (
                    <button
                        type="button"
                        className="pf-btn pf-btn--primary pf-btn--block"
                        onClick={() =>
                            openDashboard(projectDashboardUrl(webAppUrl, primaryProject.id))
                        }
                    >
                        {projects.length === 1 ? "Open project" : "Open primary project"}
                        <ExternalLinkIcon />
                    </button>
                ) : (
                    <button
                        type="button"
                        className="pf-btn pf-btn--primary pf-btn--block"
                        onClick={() => openDashboard(setupHref)}
                    >
                        Connect on web
                        <ExternalLinkIcon />
                    </button>
                )}

                <button
                    type="button"
                    className="pf-btn pf-btn--secondary pf-btn--block"
                    onClick={() => openDashboard(homeUrl)}
                >
                    All projects
                    <ExternalLinkIcon />
                </button>
            </div>

            <p className="pf-connection-footnote">
                Sync and settings run on <strong>{dashboardHost}</strong> — this plugin only shows
                whether this Framer site is linked.
            </p>
        </PluginShell>
    )
}
