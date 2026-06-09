import type { ReactNode } from "react"

type Tone = "ok" | "warn" | "err" | "neutral"

interface StatusBadgeProps {
    tone: Tone
    children: ReactNode
}

export function StatusBadge({ tone, children }: StatusBadgeProps) {
    return <span className={`pf-badge pf-badge--${tone}`}>{children}</span>
}
