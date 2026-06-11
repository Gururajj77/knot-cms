import type { ReactNode } from "react"
import { Wordmark } from "./components/Wordmark"

interface PluginShellProps {
    children: ReactNode
    footer: ReactNode
}

export function PluginShell({ children, footer }: PluginShellProps) {
    return (
        <div className="pf-plugin">
            <header className="pf-plugin-header">
                <Wordmark />
                <span className="pf-plugin-eyebrow">Canvas connector</span>
            </header>

            <main className="pf-plugin-main">{children}</main>

            <footer className="pf-plugin-footer">{footer}</footer>
        </div>
    )
}
