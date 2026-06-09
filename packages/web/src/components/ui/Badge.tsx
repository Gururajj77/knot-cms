import type { ReactNode } from "react"
import { cn } from "../../lib/cn"
import type { HealthTone } from "../../lib/project-health"
import { StatusDot } from "./StatusDot"

interface BadgeProps {
    tone: HealthTone
    children: ReactNode
    className?: string
}

export function Badge({ tone, children, className }: BadgeProps) {
    return (
        <span className={cn("pf-badge", `pf-badge--${tone}`, className)}>
            <StatusDot tone={tone} />
            {children}
        </span>
    )
}
