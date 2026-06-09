import { cn } from "../../lib/cn"
import type { HealthTone } from "../../lib/project-health"

interface StatusDotProps {
    tone: HealthTone
    className?: string
}

export function StatusDot({ tone, className }: StatusDotProps) {
    return <span className={cn("pf-status-dot", `pf-status-dot--${tone}`, className)} aria-hidden />
}
