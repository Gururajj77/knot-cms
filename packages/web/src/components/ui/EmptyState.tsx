import type { ReactNode } from "react"

interface EmptyStateProps {
    title: string
    description: string
    action?: ReactNode
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
    return (
        <div className="pf-empty">
            <div className="pf-empty-graphic" aria-hidden />
            <h3 className="pf-empty-title">{title}</h3>
            <p className="pf-empty-desc">{description}</p>
            {action ? <div className="pf-empty-action">{action}</div> : null}
        </div>
    )
}
