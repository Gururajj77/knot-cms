import type { ReactNode } from "react"
import { Wordmark } from "./components/Wordmark"

interface PluginShellProps {
    children: ReactNode
    title: string
    subtitle: string
    footer: ReactNode
}

export function PluginShell({ children, title, subtitle, footer }: PluginShellProps) {
    return (
        <div className="pf-plugin">
            <div className="pf-plugin-glow" aria-hidden />
            <div className="pf-plugin-body">
                <div className="pf-plugin-card">
                    <div className="pf-plugin-head">
                        <Wordmark />
                        <h1 className="pf-plugin-title">{title}</h1>
                        <p className="pf-plugin-subtitle">{subtitle}</p>
                    </div>

                    <div className="pf-plugin-content">{children}</div>

                    <div className="pf-plugin-footer">{footer}</div>
                </div>
            </div>
        </div>
    )
}
