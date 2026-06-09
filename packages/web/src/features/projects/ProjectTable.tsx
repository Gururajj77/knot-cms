import { ChevronRight } from "lucide-react"
import { Link } from "react-router-dom"
import type { ProjectStatus } from "@notion-framer/shared"
import { ROUTES } from "../../constants/routes"
import { formatRelativeTime } from "../../lib/format"
import { NotionLogo, FramerLogo } from "../../components/brand"
import { ProjectStatusBadge } from "./ProjectStatusBadge"

interface ProjectTableProps {
    projects: ProjectStatus[]
}

export function ProjectTable({ projects }: ProjectTableProps) {
    return (
        <div className="pf-resource-list">
            {projects.map(project => (
                <Link key={project.id} to={ROUTES.project(project.id)} className="pf-resource-row">
                    <div className="pf-resource-row-leading">
                        <div className="pf-resource-icons">
                            <NotionLogo size={14} />
                            <span className="pf-resource-icons-line" aria-hidden />
                            <FramerLogo size={14} />
                        </div>
                        <div className="pf-resource-copy">
                            <span className="pf-resource-title">
                                {project.notionDataSourceTitle ?? "Untitled"}
                            </span>
                            <span className="pf-resource-sub">Notion → Framer CMS</span>
                        </div>
                    </div>
                    <div className="pf-resource-row-trailing">
                        <ProjectStatusBadge status={project} />
                        <span className="pf-resource-meta">{formatRelativeTime(project.lastSyncAt)}</span>
                        <span className="pf-resource-meta pf-resource-meta--mono">
                            {project.itemsSyncedCount} items
                        </span>
                        <ChevronRight size={16} className="pf-resource-chevron" aria-hidden />
                    </div>
                </Link>
            ))}
        </div>
    )
}
