import { Plus } from "lucide-react"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { useAuthContext } from "../../app/AuthContext"
import { ROUTES } from "../../constants/routes"
import { fetchDashboardProjects } from "../../lib/api"
import { AppShell } from "../../components/layout"
import { Banner, buttonClass, EmptyState, ProjectCardSkeleton } from "../../components/ui"
import { useAsyncData } from "../../hooks/useAsyncData"
import { ProjectTable } from "./ProjectTable"

export function DashboardPage() {
    const { auth, refresh } = useAuthContext()
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

    return (
        <AppShell
            title="Projects"
            subtitle="Notion databases synced to Framer CMS."
            email={auth?.email}
            onLogout={refresh}
            actions={
                <Link className={buttonClass("primary")} to={ROUTES.setup}>
                    <Plus size={15} strokeWidth={2} aria-hidden />
                    New project
                </Link>
            }
        >
            {error ? <Banner tone="error">{error}</Banner> : null}
            {deleteWarning ? <Banner tone="info">{deleteWarning}</Banner> : null}

            {loading ? (
                <div className="pf-panel pf-panel--loading">
                    <ProjectCardSkeleton />
                    <ProjectCardSkeleton />
                    <ProjectCardSkeleton />
                </div>
            ) : !projects?.length ? (
                <EmptyState
                    title="No projects yet"
                    description="Connect Notion and map fields to your Framer CMS collection."
                    action={
                        <Link className={buttonClass("primary")} to={ROUTES.setup}>
                            <Plus size={15} aria-hidden />
                            Create project
                        </Link>
                    }
                />
            ) : (
                <>
                    <p className="pf-list-meta">{count} connection{count === 1 ? "" : "s"}</p>
                    <ProjectTable projects={projects} />
                </>
            )}
        </AppShell>
    )
}
