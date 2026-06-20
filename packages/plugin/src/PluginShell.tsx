import type { ReactNode } from "react"
import { ThemeToggle } from "./components/ThemeToggle"
import { Wordmark } from "./components/Wordmark"
import { usePluginTheme } from "./usePluginTheme"

interface PluginShellProps {
    children: ReactNode
    footer: ReactNode
}

export function PluginShell({ children, footer }: PluginShellProps) {
    const { theme, toggleTheme } = usePluginTheme()

    return (
        <div className="pf-plugin">
            <header className="pf-plugin-topbar">
                <Wordmark size="sm" />
                <ThemeToggle theme={theme} onToggle={toggleTheme} />
            </header>

            <main className="pf-plugin-main">{children}</main>

            <footer className="pf-plugin-footer">{footer}</footer>
        </div>
    )
}
