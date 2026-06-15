type StatusTone = "connected" | "disconnected" | "warning" | "neutral"

interface StatusBadgeProps {
    tone: StatusTone
    label: string
}

const TONE_CLASS: Record<StatusTone, string> = {
    connected: "pf-status-badge--connected",
    disconnected: "pf-status-badge--disconnected",
    warning: "pf-status-badge--warning",
    neutral: "pf-status-badge--neutral",
}

export function StatusBadge({ tone, label }: StatusBadgeProps) {
    return (
        <span className={["pf-status-badge", TONE_CLASS[tone]].join(" ")}>
            <span className="pf-status-badge-dot" aria-hidden />
            {label}
        </span>
    )
}
