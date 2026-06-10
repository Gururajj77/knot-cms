import { ChevronRight } from "lucide-react"
import { Link } from "react-router-dom"
import type { ProjectStatus } from "@nocms/shared"
import { ROUTES } from "../../constants/routes"
import { formatRelativeTime } from "../../lib/format"
import { NotionLogo, FramerLogo } from "../../components/brand"
import { ProjectStatusBadge } from "./ProjectStatusBadge"

interface ProjectTableProps {
    projects: ProjectStatus[]
}

export function ProjectTable({ projects }: ProjectTableProps) {
    return (
        <div className="pf-data-panel">
            <div className="pf-data-panel-header" aria-hidden>
                <span>Connection</span>
                <span>Status</span>
                <span>Last sync</span>
                <span>Items</span>
                <span />
            </div>
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
                        <div className="pf-resource-row-cell">
                            <ProjectStatusBadge status={project} />
                        </div>
                        <span className="pf-resource-row-cell pf-resource-meta">
                            {formatRelativeTime(project.lastSyncAt)}
                        </span>
                        <span className="pf-resource-row-cell pf-resource-meta pf-resource-meta--mono">
                            {project.itemsSyncedCount}
                        </span>
                        <ChevronRight size={16} className="pf-resource-chevron" aria-hidden />
                    </Link>
                ))}
            </div>
        </div>
    )
}
