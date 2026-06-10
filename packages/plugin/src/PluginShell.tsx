import type { ReactNode } from "react"
import { Wordmark } from "./brand"

interface PluginShellProps {
    children: ReactNode
    badge?: string
}

export function PluginShell({ children, badge }: PluginShellProps) {
    return (
        <div className="nf-shell">
            <header className="nf-header">
                <div className="nf-brand">
                    <Wordmark size="sm" />
                </div>
                {badge ? (
                    <div className="nf-header-live">
                        <span className="nf-live-dot" aria-hidden />
                        <span>{badge}</span>
                    </div>
                ) : null}
            </header>
            <div className="nf-main">{children}</div>
        </div>
    )
}
