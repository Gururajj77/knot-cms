import { FramerLogo, GoogleSheetsLogo, NotionLogo } from "./IntegrationLogos"

function FlowArrow() {
    return (
        <svg
            className="pf-flow-arrow"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
        >
            <path
                d="M5 12h14M13 6l6 6-6 6"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    )
}

interface PipelineFlowProps {
    compact?: boolean
}

export function PipelineFlow({ compact = false }: PipelineFlowProps) {
    const iconSize = compact ? 18 : 22

    return (
        <div
            className={compact ? "pf-flow pf-flow--compact" : "pf-flow"}
            aria-label="Notion or Google Sheets syncs into Framer CMS"
        >
            <div className="pf-flow-end">
                <div className="pf-flow-node pf-flow-node--sources">
                    <NotionLogo size={iconSize} />
                    <GoogleSheetsLogo size={iconSize} />
                </div>
                {compact ? <span className="pf-flow-label">Source</span> : null}
            </div>

            <div className="pf-flow-connector" aria-hidden>
                <span className="pf-flow-line" />
                <FlowArrow />
                <span className="pf-flow-line" />
            </div>

            <div className="pf-flow-end">
                <div className="pf-flow-node pf-flow-node--dest">
                    <FramerLogo size={iconSize} />
                </div>
                {compact ? <span className="pf-flow-label">Framer CMS</span> : null}
            </div>
        </div>
    )
}
