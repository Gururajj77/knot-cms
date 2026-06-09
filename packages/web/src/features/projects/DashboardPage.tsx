import { Link } from "react-router-dom"
import { useAuthContext } from "../../app/AuthContext"
import { ROUTES } from "../../constants/routes"
import { fetchDashboardProjects } from "../../lib/api"
import { formatRelativeTime } from "../../lib/format"
import { AppShell, PageToolbar } from "../../components/layout"
import { Banner, buttonClass, Card, EmptyState, Spinner } from "../../components/ui"
import { useAsyncData } from "../../hooks/useAsyncData"
import { ProjectStatusBadge } from "./ProjectStatusBadge"

export function DashboardPage() {
    const { auth, refresh } = useAuthContext()
    const { data: projects, error, loading } = useAsyncData(() => fetchDashboardProjects(), [])

    return (
        <AppShell
            title="Projects"
            subtitle="Notion databases synced to your Framer CMS collections."
            email={auth?.email}
            onLogout={refresh}
        >
            {error ? <Banner tone="error">{error}</Banner> : null}

            <PageToolbar
                meta={loading ? "Loading…" : `${projects?.length ?? 0} project${projects?.length === 1 ? "" : "s"}`}
                actions={
                    <Link className={buttonClass("primary")} to={ROUTES.setup}>
                        New project
                    </Link>
                }
            />

            <Card>
                {loading ? (
                    <Spinner label="Loading projects…" />
                ) : !projects?.length ? (
                    <EmptyState
                        title="No projects yet"
                        description="Connect Notion and Framer to create your first sync pipeline."
                        action={
                            <Link className={buttonClass("primary")} to={ROUTES.setup}>
                                Create your first project
                            </Link>
                        }
                    />
                ) : (
                    <ul className="pf-project-list">
                        {projects.map(project => (
                            <li key={project.id} className="pf-project-row">
                                <div className="pf-project-row-main">
                                    <ProjectStatusBadge status={project} />
                                    <h3 className="pf-project-row-title">
                                        {project.notionDataSourceTitle ?? "Untitled"}
                                    </h3>
                                    <p className="pf-muted">
                                        Last sync {formatRelativeTime(project.lastSyncAt)}
                                        <span className="pf-sep">·</span>
                                        {project.itemsSyncedCount} items
                                    </p>
                                </div>
                                <Link className={buttonClass("secondary")} to={ROUTES.project(project.id)}>
                                    Open
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </Card>
        </AppShell>
    )
}
