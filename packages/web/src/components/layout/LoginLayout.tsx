import type { ReactNode } from "react"
import { Check, RefreshCw, Sparkles, Workflow } from "lucide-react"
import { Wordmark } from "../brand"
import { PipelineFlow } from "../ui/PipelineFlow"

const FEATURES = [
    {
        icon: Workflow,
        title: "Map once, sync forever",
        description: "Connect Notion, match fields to Framer CMS, and keep collections updated.",
    },
    {
        icon: RefreshCw,
        title: "Auto-sync on changes",
        description: "Edits in Notion flow to Framer when you're on Pro — no manual exports.",
    },
    {
        icon: Sparkles,
        title: "Optional auto-publish",
        description: "Push synced content live automatically with the Framer Server API.",
    },
] as const

interface LoginLayoutProps {
    children: ReactNode
    footer?: ReactNode
}

export function LoginLayout({ children, footer }: LoginLayoutProps) {
    return (
        <div className="pf-login">
            <div className="pf-login-brand" aria-hidden={false}>
                <div className="pf-login-brand-grid" aria-hidden />
                <div className="pf-login-brand-inner">
                    <Wordmark size="lg" className="pf-login-wordmark" />
                    <h1 className="pf-login-headline">
                        Notion → Framer CMS,
                        <span className="pf-login-headline-accent"> without the busywork</span>
                    </h1>
                    <p className="pf-login-tagline">
                        Set up your pipeline once. Keep Framer collections in sync with Notion —
                        manually or automatically.
                    </p>
                    <div className="pf-login-pipeline-wrap">
                        <PipelineFlow />
                    </div>
                    <ul className="pf-login-features">
                        {FEATURES.map(feature => (
                            <li key={feature.title} className="pf-login-feature">
                                <span className="pf-login-feature-icon" aria-hidden>
                                    <feature.icon size={16} strokeWidth={2} />
                                </span>
                                <div>
                                    <strong>{feature.title}</strong>
                                    <p>{feature.description}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            <div className="pf-login-panel">
                <div className="pf-login-panel-inner">
                    <div className="pf-login-form-header">
                        <span className="pf-login-eyebrow">
                            <Check size={12} strokeWidth={2.5} aria-hidden />
                            Sign in
                        </span>
                        <h2 className="pf-login-form-title">Continue to your dashboard</h2>
                        <p className="pf-login-form-lead">
                            Use Google — the same email you use at checkout unlocks your plan.
                        </p>
                    </div>

                    <div className="pf-login-form">{children}</div>

                    {footer ? <div className="pf-login-form-footer">{footer}</div> : null}
                </div>
            </div>
        </div>
    )
}
