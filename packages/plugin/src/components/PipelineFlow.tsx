import { FramerLogo, GoogleSheetsLogo, NotionLogo } from "./IntegrationLogos"

function FlowArrow() {
    return (
        <svg
            className="pf-plugin-flow-arrow"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
        >
            <path
                d="M5 12h14M13 6l6 6-6 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    )
}

export function PipelineFlow() {
    return (
        <div className="pf-plugin-flow" aria-label="Notion or Google Sheets to Framer CMS">
            <span className="pf-plugin-flow-sources" aria-hidden>
                <NotionLogo size={20} />
                <GoogleSheetsLogo size={20} />
            </span>
            <span className="pf-plugin-flow-line" aria-hidden />
            <FlowArrow />
            <span className="pf-plugin-flow-line" aria-hidden />
            <FramerLogo size={20} />
        </div>
    )
}
