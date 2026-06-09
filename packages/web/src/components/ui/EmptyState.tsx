import { Layers } from "lucide-react"
import type { ReactNode } from "react"

interface EmptyStateProps {
    title: string
    description: string
    action?: ReactNode
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
    return (
        <div className="pf-empty">
            <div className="pf-empty-icon" aria-hidden>
                <Layers size={22} strokeWidth={1.5} />
            </div>
            <h3 className="pf-empty-title">{title}</h3>
            <p className="pf-empty-desc">{description}</p>
            {action ? <div className="pf-empty-action">{action}</div> : null}
        </div>
    )
}
