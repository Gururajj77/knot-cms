import { FramerLogo, NotionLogo } from "./IntegrationLogos"

export function PipelineFlow() {
    return (
        <div className="pf-pipeline" aria-label="Notion to Framer pipeline">
            <NotionLogo size={18} />
            <span className="pf-pipeline-line" aria-hidden />
            <span className="pf-status-dot pf-status-dot--ok" aria-hidden />
            <span className="pf-pipeline-line" aria-hidden />
            <FramerLogo size={18} />
        </div>
    )
}
