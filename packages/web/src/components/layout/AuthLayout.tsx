import type { ReactNode } from "react"
import { Wordmark } from "../brand"

interface AuthLayoutProps {
    title: string
    subtitle: ReactNode
    children: ReactNode
    wide?: boolean
}

export function AuthLayout({ title, subtitle, children, wide }: AuthLayoutProps) {
    return (
        <div className="pf-auth">
            <div className="pf-auth-glow" aria-hidden />
            <div className={wide ? "pf-auth-card pf-auth-card--wide" : "pf-auth-card"}>
                <Wordmark size="md" className="pf-auth-brand" />
                <h1 className="pf-auth-title">{title}</h1>
                <p className="pf-auth-subtitle">{subtitle}</p>
                <div className="pf-auth-form">{children}</div>
            </div>
        </div>
    )
}
