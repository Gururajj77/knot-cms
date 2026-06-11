import { Plus } from "lucide-react"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { useAuthContext } from "../../app/AuthContext"
import { ROUTES } from "../../constants/routes"
import { fetchDashboardProjects } from "../../lib/api"
import { AppShell } from "../../components/layout"
import { PlanUsageBanner } from "../auth/PlanUsageBanner"
import { Banner, buttonClass, EmptyState, ProjectCardSkeleton } from "../../components/ui"
import { useAsyncData } from "../../hooks/useAsyncData"
import { ProjectTable } from "./ProjectTable"

export function DashboardPage() {
    const { refresh, canCreateProject, usage } = useAuthContext()
    const { data: projects, error, loading } = useAsyncData(() => fetchDashboardProjects(), [])
    const [deleteWarning, setDeleteWarning] = useState<string | null>(null)

    useEffect(() => {
        const warning = sessionStorage.getItem("pf_delete_warning")
        if (warning) {
            setDeleteWarning(warning)
            sessionStorage.removeItem("pf_delete_warning")
        }
    }, [])

    const count = projects?.length ?? 0
    const healthyCount = projects?.filter(p => !p.lastError).length ?? 0
    const issueCount = count - healthyCount

    const newProjectAction = canCreateProject ? (
        <Link className={buttonClass("primary")} to={ROUTES.setup}>
            <Plus size={15} strokeWidth={2} aria-hidden />
            New project
        </Link>
    ) : (
        <Link className={buttonClass("secondary")} to={ROUTES.plans} title="Project limit reached">
            View plans
        </Link>
    )

    return (
        <AppShell
            title="Projects"
            subtitle="Notion databases synced to Framer CMS."
            actions={newProjectAction}
        >
            <PlanUsageBanner usage={usage} />
            {error ? <Banner tone="error">{error}</Banner> : null}
            {deleteWarning ? <Banner tone="info">{deleteWarning}</Banner> : null}

            {loading ? (
                <div className="pf-data-panel pf-data-panel--loading">
                    <ProjectCardSkeleton />
                    <ProjectCardSkeleton />
                    <ProjectCardSkeleton />
                </div>
            ) : !projects?.length ? (
                <EmptyState
                    title="No projects yet"
                    description="Connect Notion, map your fields, and keep Framer CMS in sync automatically."
                    action={
                        canCreateProject ? (
                            <Link className={buttonClass("primary")} to={ROUTES.setup}>
                                <Plus size={15} aria-hidden />
                                Create project
                            </Link>
                        ) : (
                            <Link className={buttonClass("primary")} to={ROUTES.plans}>
                                View plans
                            </Link>
                        )
                    }
                />
            ) : (
                <div className="pf-dashboard">
                    <div className="pf-stat-cards">
                        <div className="pf-stat-card">
                            <span className="pf-stat-card-label">Connections</span>
                            <span className="pf-stat-card-value">{count}</span>
                        </div>
                        <div className="pf-stat-card">
                            <span className="pf-stat-card-label">Healthy</span>
                            <span className="pf-stat-card-value pf-stat-card-value--ok">{healthyCount}</span>
                        </div>
                        <div className="pf-stat-card">
                            <span className="pf-stat-card-label">Needs attention</span>
                            <span
                                className={`pf-stat-card-value${issueCount > 0 ? " pf-stat-card-value--warn" : ""}`}
                            >
                                {issueCount}
                            </span>
                        </div>
                    </div>
                    <ProjectTable projects={projects} />
                </div>
            )}
        </AppShell>
    )
}
