import type { ReactNode } from "react"
import { cn } from "../../lib/cn"

interface CardProps {
    children: ReactNode
    className?: string
}

export function Card({ children, className }: CardProps) {
    return <div className={cn("pf-card", className)}>{children}</div>
}

interface CardHeaderProps {
    eyebrow?: string
    title: ReactNode
    description?: ReactNode
}

export function CardHeader({ eyebrow, title, description }: CardHeaderProps) {
    return (
        <header className="pf-card-header">
            {eyebrow ? <p className="pf-eyebrow">{eyebrow}</p> : null}
            <h2 className="pf-card-title">{title}</h2>
            {description ? <p className="pf-card-desc">{description}</p> : null}
        </header>
    )
}
