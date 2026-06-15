import type { ReactNode } from "react"
import { Wordmark } from "./components/Wordmark"

interface PluginShellProps {
    children: ReactNode
    footer: ReactNode
}

export function PluginShell({ children, footer }: PluginShellProps) {
    return (
        <div className="pf-plugin">
            <header className="pf-plugin-topbar">
                <Wordmark size="sm" />
            </header>

            <main className="pf-plugin-body">{children}</main>

            <footer className="pf-plugin-footer">{footer}</footer>
        </div>
    )
}
