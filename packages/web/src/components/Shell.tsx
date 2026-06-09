import type { ReactNode } from "react"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { fetchAuthMe, logout } from "../api"

interface ShellProps {
    title?: string
    children: ReactNode
    onLogout?: () => void
}

export function Shell({ title, children, onLogout }: ShellProps) {
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

    return (
        <div className="pf-shell">
            <header className="pf-header">
                <Link to="/" className="pf-logo">
                    PublishFlow
                </Link>
                <div className="pf-actions" style={{ marginTop: 0 }}>
                    <span className="pf-meta">{email}</span>
                    <button type="button" className="secondary" onClick={() => void handleLogout()}>
                        Sign out
                    </button>
                </div>
            </header>
            {title ? <h1 className="pf-title">{title}</h1> : null}
            {children}
        </div>
    )
}
