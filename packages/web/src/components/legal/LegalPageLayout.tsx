import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import { Wordmark } from "../brand"
import { ROUTES } from "../../constants/routes"
import { LegalFooter } from "./LegalFooter"

interface LegalPageLayoutProps {
    title: string
    lastUpdated: string
    children: ReactNode
}

export function LegalPageLayout({ title, lastUpdated, children }: LegalPageLayoutProps) {
    return (
        <div className="pf-legal-page">
            <header className="pf-legal-page-top">
                <Link to={ROUTES.home}>
                    <Wordmark size="sm" />
                </Link>
                <Link className="pf-legal-page-back" to={ROUTES.home}>
                    Back to app
                </Link>
            </header>

            <main className="pf-legal">
                <div className="pf-legal-inner">
                    <header className="pf-legal-header">
                        <h1 className="pf-legal-title">{title}</h1>
                        <p className="pf-legal-meta">Last updated: {lastUpdated}</p>
                    </header>
                    <article className="pf-legal-body">{children}</article>
                    <nav className="pf-legal-nav" aria-label="Related legal pages">
                        <Link to={ROUTES.legal.privacy}>Privacy Policy</Link>
                        <Link to={ROUTES.legal.terms}>Terms &amp; Conditions</Link>
                        <Link to={ROUTES.legal.refund}>Refund Policy</Link>
                        <Link to={ROUTES.home}>Back to app</Link>
                    </nav>
                </div>
            </main>

            <footer className="pf-app-legal-footer">
                <LegalFooter centered />
            </footer>
        </div>
    )
}
