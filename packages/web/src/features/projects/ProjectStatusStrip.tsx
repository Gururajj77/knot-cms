import type { ProjectStatus } from "@knotcms/shared"
import { projectStatusSummary } from "../../lib/project-overview"

interface ProjectStatusStripProps {
    status: ProjectStatus
}

export function ProjectStatusStrip({ status }: ProjectStatusStripProps) {
    const summary = projectStatusSummary(status)

    return (
        <div className={`pf-project-status-strip pf-project-status-strip--${summary.tone}`} role="status">
            <div className="pf-project-status-strip-main">
                <span className={`pf-live-dot pf-live-dot--${summary.tone}`} aria-hidden />
                <div className="pf-project-status-strip-copy">
                    <p className="pf-project-status-strip-title">{summary.title}</p>
                    <p className="pf-project-status-strip-detail">{summary.detail}</p>
                </div>
            </div>
        </div>
    )
}
