import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import { ROUTES } from "../../constants/routes"
import { logout } from "../../lib/api"
import { Wordmark } from "../brand"
import { Button } from "../ui"

interface AppShellProps {
    title?: string
    subtitle?: string
    backTo?: { label: string; href: string }
    email?: string
    onLogout?: () => void
    children: ReactNode
}

export function AppShell({ title, subtitle, backTo, email, onLogout, children }: AppShellProps) {
    const initial = email ? email.charAt(0).toUpperCase() : "?"

    const handleLogout = async () => {
        await logout()
        onLogout?.()
    }

    return (
        <div className="pf-app">
            <header className="pf-app-header">
                <div className="pf-app-header-inner">
                    <Link to={ROUTES.home} className="pf-brand-link">
                        <Wordmark size="sm" />
                    </Link>
                    <div className="pf-header-actions">
                        {email ? (
                            <>
                                <span className="pf-avatar" title={email} aria-hidden>
                                    {initial}
                                </span>
                                <span className="pf-muted pf-header-email">{email}</span>
                            </>
                        ) : null}
                        <Button variant="secondary" onClick={() => void handleLogout()}>
                            Sign out
                        </Button>
                    </div>
                </div>
            </header>

            <main className="pf-main">
                {backTo ? (
                    <Link className="pf-back-link" to={backTo.href}>
                        ← {backTo.label}
                    </Link>
                ) : null}

                {title ? (
                    <header className="pf-page-header">
                        <h1 className="pf-page-title">{title}</h1>
                        {subtitle ? <p className="pf-page-subtitle">{subtitle}</p> : null}
                    </header>
                ) : null}

                {children}
            </main>
        </div>
    )
}
