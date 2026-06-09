import type { ReactNode } from "react"
import { CreditCard, FolderKanban, LogOut, Plus } from "lucide-react"
import { Link, useLocation } from "react-router-dom"
import { ROUTES } from "../../constants/routes"
import { logout } from "../../lib/api"
import { cn } from "../../lib/cn"
import { Wordmark } from "../brand"

interface AppShellProps {
    title?: string
    subtitle?: string
    backTo?: { label: string; href: string }
    email?: string
    actions?: ReactNode
    onLogout?: () => void
    children: ReactNode
}

const NAV_ITEMS = [
    { label: "Projects", href: ROUTES.home, icon: FolderKanban, exact: true },
    { label: "New project", href: ROUTES.setup, icon: Plus },
    { label: "Billing", href: ROUTES.subscribe, icon: CreditCard },
]

export function AppShell({
    title,
    subtitle,
    backTo,
    email,
    actions,
    onLogout,
    children,
}: AppShellProps) {
    const location = useLocation()
    const initial = email ? email.charAt(0).toUpperCase() : "?"

    const handleLogout = async () => {
        await logout()
        onLogout?.()
    }

    return (
        <div className="pf-app">
            <header className="pf-topbar">
                <Link to={ROUTES.home} className="pf-topbar-brand">
                    <Wordmark size="sm" />
                </Link>
                <div className="pf-topbar-spacer" />
                {email ? (
                    <div className="pf-topbar-user">
                        <span className="pf-avatar" title={email}>
                            {initial}
                        </span>
                        <span className="pf-topbar-email">{email}</span>
                    </div>
                ) : null}
                <button type="button" className="pf-topbar-btn" onClick={() => void handleLogout()}>
                    <LogOut size={14} aria-hidden />
                </button>
            </header>

            <div className="pf-app-body">
                <aside className="pf-sidebar">
                    <nav className="pf-sidebar-nav" aria-label="Main">
                        {NAV_ITEMS.map(item => {
                            const active = item.exact
                                ? location.pathname === item.href
                                : location.pathname.startsWith(item.href)
                            const Icon = item.icon
                            return (
                                <Link
                                    key={item.href}
                                    to={item.href}
                                    className={cn("pf-sidebar-link", active && "pf-sidebar-link--active")}
                                >
                                    <Icon size={16} strokeWidth={1.5} aria-hidden />
                                    {item.label}
                                </Link>
                            )
                        })}
                    </nav>
                </aside>

                <div className="pf-app-content">
                    {(title || backTo) && (
                        <header className="pf-page-bar">
                            <div className="pf-page-bar-text">
                                {backTo ? (
                                    <nav className="pf-breadcrumb" aria-label="Breadcrumb">
                                        <Link to={backTo.href}>{backTo.label}</Link>
                                        <span className="pf-breadcrumb-sep">/</span>
                                        <span className="pf-breadcrumb-current">{title}</span>
                                    </nav>
                                ) : (
                                    <>
                                        {title ? <h1 className="pf-page-title">{title}</h1> : null}
                                        {subtitle ? <p className="pf-page-subtitle">{subtitle}</p> : null}
                                    </>
                                )}
                            </div>
                            {actions ? <div className="pf-page-bar-actions">{actions}</div> : null}
                        </header>
                    )}

                    <main className="pf-main">{children}</main>
                </div>
            </div>
        </div>
    )
}
