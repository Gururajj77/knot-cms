import type { ReactNode } from "react"

interface AuthLayoutProps {
    title: string
    subtitle: ReactNode
    children: ReactNode
}

export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
    return (
        <div className="pf-auth">
            <div className="pf-auth-panel">
                <div className="pf-auth-brand">
                    <span className="pf-mark" aria-hidden>
                        PF
                    </span>
                    <span className="pf-wordmark">PublishFlow</span>
                </div>
                <h1 className="pf-auth-title">{title}</h1>
                <p className="pf-auth-subtitle">{subtitle}</p>
                <div className="pf-auth-actions">{children}</div>
            </div>
            <aside className="pf-auth-aside">
                <p className="pf-auth-tagline">Write in Notion. Ship on Framer.</p>
                <ul className="pf-auth-features">
                    <li>Two-way field mapping to Framer CMS</li>
                    <li>Auto-sync when Notion pages change</li>
                    <li>Optional publish after every sync</li>
                </ul>
            </aside>
        </div>
    )
}
