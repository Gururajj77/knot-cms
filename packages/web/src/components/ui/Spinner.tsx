import { cn } from "../../lib/cn"

interface SpinnerProps {
    label?: string
    size?: "sm" | "md"
}

export function Spinner({ label, size = "md" }: SpinnerProps) {
    return (
        <div className={cn("pf-spinner-wrap", size === "sm" && "pf-spinner-wrap--sm")} role="status">
            <span className="pf-spinner" aria-hidden />
            {label ? <span className="pf-muted">{label}</span> : null}
        </div>
    )
}
