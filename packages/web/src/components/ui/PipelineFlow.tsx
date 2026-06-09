import { FramerLogo, NotionLogo } from "../brand/IntegrationLogos"
import { StatusDot } from "./StatusDot"
import type { HealthTone } from "../../lib/project-health"

interface PipelineFlowProps {
    health?: HealthTone
    compact?: boolean
}

export function PipelineFlow({ health = "ok", compact = false }: PipelineFlowProps) {
    return (
        <div
            className={`pf-pipeline${compact ? " pf-pipeline--compact" : ""}`}
            aria-label="Notion to Framer pipeline"
        >
            <NotionLogo size={compact ? 14 : 16} />
            <span className="pf-pipeline-line" aria-hidden />
            <StatusDot tone={health} />
            <span className="pf-pipeline-line" aria-hidden />
            <FramerLogo size={compact ? 14 : 16} />
        </div>
    )
}
