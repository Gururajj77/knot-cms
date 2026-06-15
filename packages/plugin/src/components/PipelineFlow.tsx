import { FramerLogo, GoogleSheetsLogo, NotionLogo } from "./IntegrationLogos"

function FlowArrow() {
    return (
        <svg
            className="pf-flow-arrow"
            width="18"
            height="18"
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

export function PipelineFlow() {
    return (
        <div className="pf-flow" aria-label="Content flows from your source into Framer CMS">
            <div className="pf-flow-node pf-flow-node--sources">
                <NotionLogo size={22} />
                <GoogleSheetsLogo size={22} />
            </div>
            <div className="pf-flow-connector" aria-hidden>
                <span className="pf-flow-line" />
                <FlowArrow />
                <span className="pf-flow-line" />
            </div>
            <div className="pf-flow-node pf-flow-node--dest">
                <FramerLogo size={22} />
            </div>
        </div>
    )
}
