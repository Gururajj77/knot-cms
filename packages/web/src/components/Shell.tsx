import type { ReactNode } from "react"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { fetchAuthMe, logout } from "../api"

interface ShellProps {
    title?: string
    subtitle?: string
    backTo?: { label: string; href: string }
    children: ReactNode
    onLogout?: () => void
}

export function Shell({ title, subtitle, backTo, children, onLogout }: ShellProps) {
    const [email, setEmail] = useState("")

    useEffect(() => {
        void fetchAuthMe().then(me => {
            if (me.email) setEmail(me.email)
        })
    }, [])

    const handleLogout = async () => {
        await logout()
        onLogout?.()
    }

    const initial = email ? email.charAt(0).toUpperCase() : "?"

    return (
        <>
            <header className="pf-app-header">
                <div className="pf-app-header-inner">
                    <Link to="/" className="pf-brand">
                        <span className="pf-mark" aria-hidden>
                            PF
                        </span>
                        <span className="pf-wordmark">PublishFlow</span>
                    </Link>
                    <div className="pf-header-user">
                        <span className="pf-avatar" title={email} aria-hidden>
                            {initial}
                        </span>
                        <span className="pf-meta">{email}</span>
                        <button type="button" className="secondary" onClick={() => void handleLogout()}>
                            Sign out
                        </button>
                    </div>
                </div>
            </header>
            <div className="pf-shell">
                {backTo ? (
                    <Link className="pf-back-link" to={backTo.href}>
                        ← {backTo.label}
                    </Link>
                ) : null}
                {title ? (
                    <div className="pf-page-head">
                        <h1 className="pf-title">{title}</h1>
                        {subtitle ? <p className="pf-subtitle">{subtitle}</p> : null}
                    </div>
                ) : null}
                {children}
            </div>
        </>
    )
}
