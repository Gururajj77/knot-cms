import { framer } from "framer-plugin"
import { Wordmark } from "./brand"
import { WizardShell } from "./WizardShell"

const FEATURES = [
    ["Notion → Framer", "Database fields map directly to CMS fields"],
    ["Server-side sync", "Runs on a worker — no browser tab required"],
    ["Auto publish", "Optional — push live when you save in Notion"],
] as const

interface PluginIntroProps {
    onGetStarted: () => void
}

export function PluginIntro({ onGetStarted }: PluginIntroProps) {
    return (
        <WizardShell variant="intro">
            <div className="nf-page nf-page--welcome">
                <div className="nf-page-body">
                    <div className="nf-section nf-welcome-hero">
                        <Wordmark size="lg" />
                        <h1 className="nf-hero-title">
                            Write in Notion.
                            <br />
                            Publish in Framer.
                        </h1>
                        <p className="nf-desc">
                            PublishFlow connects a Notion database to a Framer CMS collection. Edit in Notion;
                            your site stays in sync — with optional auto-publish.
                        </p>
                    </div>

                    <div className="nf-features">
                        {FEATURES.map(([title, desc]) => (
                            <div key={title} className="nf-feature">
                                <div className="nf-feature-icon" aria-hidden>
                                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                                        <path
                                            d="M1.5 4L3.5 6L6.5 2"
                                            stroke="currentColor"
                                            strokeWidth="1.5"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                </div>
                                <div>
                                    <p className="nf-feature-title">{title}</p>
                                    <p className="nf-feature-desc">{desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <p className="nf-note nf-note--inset">
                        Setup takes about 3 minutes. You’ll connect Notion, pick a database, and map fields to
                        this CMS collection.
                    </p>
                </div>

                <div className="nf-page-footer">
                    <button type="button" className="nf-btn nf-btn--primary" onClick={onGetStarted}>
                        Get started
                    </button>
                    <button type="button" className="nf-link-btn" onClick={() => framer.closePlugin()}>
                        Not now
                    </button>
                </div>
            </div>
        </WizardShell>
    )
}
