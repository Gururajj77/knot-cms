import type { ProjectStatus } from "@knotcms/shared"
import { ProjectActivityMetrics } from "./ProjectActivityMetrics"
import { ProjectConnectionBindings } from "./ProjectConnectionBindings"
import { ProjectStatusStrip } from "./ProjectStatusStrip"

interface ProjectOverviewPanelProps {
    status: ProjectStatus
    projectId: string
}

export function ProjectOverviewPanel({ status, projectId }: ProjectOverviewPanelProps) {
    return (
        <div
            id="project-panel-overview"
            role="tabpanel"
            aria-labelledby="project-tab-overview"
            className="pf-project-tab-panel"
        >
            <div className="pf-project-overview-stack">
                <ProjectStatusStrip status={status} />
                <ProjectActivityMetrics status={status} />
            </div>

            <section className="pf-project-section" aria-labelledby="project-connection-heading">
                <div className="pf-project-section-intro">
                    <h2 id="project-connection-heading" className="pf-project-section-label">
                        Connection
                    </h2>
                    <p className="pf-project-section-desc">
                        Where content comes from and which Framer CMS collection receives updates.
                    </p>
                </div>
                <ProjectConnectionBindings status={status} projectId={projectId} />
            </section>
        </div>
    )
}
