import type { ReactNode } from "react"
import { Wordmark } from "../brand"

interface SubscribeLayoutProps {
    title: string
    subtitle: ReactNode
    children: ReactNode
}

function SubscribeLayout({ title, subtitle, children }: SubscribeLayoutProps) {
    return (
        <div className="pf-subscribe-layout">
            <header className="pf-subscribe-header">
                <Wordmark size="sm" />
            </header>
            <main className="pf-subscribe-main">
                <div className="pf-subscribe-intro">
                    <h1 className="pf-subscribe-title">{title}</h1>
                    <p className="pf-subscribe-subtitle">{subtitle}</p>
                </div>
                {children}
            </main>
        </div>
    )
}
