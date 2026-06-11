import type { ReactNode } from "react"
import { FolderKanban, Plus, User } from "lucide-react"
import { Link, useLocation } from "react-router-dom"
import { useAuthContext } from "../../app/AuthContext"
import { ROUTES } from "../../constants/routes"
import { cn } from "../../lib/cn"
import { Wordmark } from "../brand"

interface AppShellProps {
    title?: string
    subtitle?: string
    backTo?: { label: string; href: string }
    actions?: ReactNode
    children: ReactNode
}

const NAV_ITEMS = [
    { id: "projects", label: "Projects", href: ROUTES.home, icon: FolderKanban, exact: true },
    { id: "setup", label: "New project", href: ROUTES.setup, icon: Plus },
    { id: "profile", label: "Profile", href: ROUTES.profilePlans, icon: User, prefix: "/profile" },
] as const

export function AppShell({ title, subtitle, backTo, actions, children }: AppShellProps) {
    const location = useLocation()
    const { canCreateProject } = useAuthContext()

    return (
        <div className="pf-app">
            <header className="pf-topbar">
                <Link to={ROUTES.home} className="pf-topbar-brand">
                    <Wordmark size="sm" />
                </Link>
            </header>

            <div className="pf-app-body">
                <aside className="pf-sidebar">
                    <p className="pf-sidebar-label">Platform</p>
                    <nav className="pf-sidebar-nav" aria-label="Main">
                        {NAV_ITEMS.map(item => {
                            const disabled = item.id === "setup" && !canCreateProject
                            const active =
                                !disabled &&
                                ("prefix" in item
                                    ? location.pathname.startsWith(item.prefix)
                                    : "exact" in item && item.exact
                                      ? location.pathname === item.href
                                      : location.pathname.startsWith(item.href))
                            const Icon = item.icon
                            if (disabled) {
                                return (
                                    <span
                                        key={item.id}
                                        className="pf-sidebar-link pf-sidebar-link--disabled"
                                        title="Project limit reached"
                                    >
                                        <Icon size={16} strokeWidth={1.5} aria-hidden />
                                        {item.label}
                                    </span>
                                )
                            }
                            return (
                                <Link
                                    key={item.id}
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
