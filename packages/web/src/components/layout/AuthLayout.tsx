import type { ReactNode } from "react"
import { Wordmark } from "../brand"

interface AuthLayoutProps {
    title: string
    subtitle: ReactNode
    children: ReactNode
}

const FEATURES = [
    "Connect Notion, Airtable, Google Sheets, and more",
    "Sync automatically when content changes",
    "Publish to your live site after each sync",
] as const

export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
    return (
        <div className="pf-auth">
            <section className="pf-auth-main">
                <div className="pf-auth-panel">
                    <Wordmark size="md" className="pf-auth-brand" />
                    <h1 className="pf-auth-title">{title}</h1>
                    <p className="pf-auth-subtitle">{subtitle}</p>
                    <div className="pf-auth-form">{children}</div>
                </div>
            </section>
            <aside className="pf-auth-aside" aria-hidden={false}>
                <p className="pf-auth-tagline">
                    Update where you work.
                    <br />
                    Ship on Framer.
                </p>
                <ul className="pf-auth-features">
                    {FEATURES.map(feature => (
                        <li key={feature}>{feature}</li>
                    ))}
                </ul>
            </aside>
        </div>
    )
}
