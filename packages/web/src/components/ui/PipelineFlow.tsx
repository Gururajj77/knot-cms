import { FramerLogo, GoogleSheetsLogo, NotionLogo } from "../brand/IntegrationLogos"
import { StatusDot } from "./StatusDot"
import type { HealthTone } from "../../lib/project-health"

interface PipelineFlowProps {
    health?: HealthTone
    compact?: boolean
}

export function PipelineFlow({ health = "ok", compact = false }: PipelineFlowProps) {
    const iconSize = compact ? 14 : 16

    return (
        <div
            className={`pf-pipeline${compact ? " pf-pipeline--compact" : ""}`}
            aria-label="Notion or Google Sheets to Framer pipeline"
        >
            <span className="pf-pipeline-sources" aria-hidden>
                <NotionLogo size={iconSize} />
                <GoogleSheetsLogo size={iconSize} />
            </span>
            <span className="pf-pipeline-line" aria-hidden />
            <StatusDot tone={health} />
            <span className="pf-pipeline-line" aria-hidden />
            <FramerLogo size={iconSize} />
        </div>
    )
}
