import type { ReactNode } from "react"
import { cn } from "../../lib/cn"

interface PageToolbarProps {
    meta?: ReactNode
    actions?: ReactNode
    className?: string
}

export function PageToolbar({ meta, actions, className }: PageToolbarProps) {
    return (
        <div className={cn("pf-toolbar", className)}>
            <div className="pf-muted">{meta}</div>
            <div className="pf-toolbar-actions">{actions}</div>
        </div>
    )
}
