import type { ProjectStatus } from "@knotcms/shared"
import { ArrowRight, Settings2 } from "lucide-react"
import { Link } from "react-router-dom"
import { ConnectorLogo, FramerLogo } from "../../components/brand"
import { buttonClass } from "../../components/ui"
import { ROUTES } from "../../constants/routes"
import { projectSourcePlugin } from "../../lib/source-provider"
import { truncateMiddle } from "../../lib/project-overview"

interface ProjectConnectionBindingsProps {
    status: ProjectStatus
    projectId: string
}

export function ProjectConnectionBindings({ status, projectId }: ProjectConnectionBindingsProps) {
    const plugin = projectSourcePlugin(status)
    const sourceTitle = status.notionDataSourceTitle ?? plugin.sourceItemLabel
    const framerCollection = status.framerCollectionName ?? "Framer CMS collection"

    return (
        <section className="pf-data-panel pf-project-bindings">
            <header className="pf-project-panel-head">
                <div>
                    <p className="pf-project-panel-desc">
                        {plugin.sourceItemLabel} linked to your Framer CMS collection. Edit to change
                        the source or field mapping.
                    </p>
                </div>
                <Link className={buttonClass("secondary")} to={ROUTES.reconfigure(projectId)}>
                    <Settings2 size={15} aria-hidden />
                    Edit connection
                </Link>
            </header>

            <div className="pf-project-pipeline" aria-label="Sync direction">
                <div className="pf-project-pipeline-node">
                    <ConnectorLogo id={plugin.logoId} size={20} />
                    <div className="pf-project-pipeline-node-copy">
                        <span className="pf-project-pipeline-label">Source</span>
                        <span className="pf-project-pipeline-name">{sourceTitle}</span>
                    </div>
                </div>
                <div className="pf-project-pipeline-arrow" aria-hidden>
                    <ArrowRight size={16} />
                    <span>syncs to</span>
                </div>
                <div className="pf-project-pipeline-node">
                    <FramerLogo size={20} />
                    <div className="pf-project-pipeline-node-copy">
                        <span className="pf-project-pipeline-label">Destination</span>
                        <span className="pf-project-pipeline-name">{framerCollection}</span>
                    </div>
                </div>
            </div>

            <dl className="pf-binding-list">
                <div className="pf-binding-row">
                    <dt>Framer project</dt>
                    <dd>
                        <a
                            href={status.framerProjectUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="pf-binding-link"
                            title={status.framerProjectUrl}
                        >
                            {truncateMiddle(status.framerProjectUrl, 56)}
                        </a>
                    </dd>
                </div>
                <div className="pf-binding-row">
                    <dt>Connection ID</dt>
                    <dd className="pf-binding-mono">{status.id}</dd>
                </div>
            </dl>
        </section>
    )
}
