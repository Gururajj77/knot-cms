interface SpinnerProps {
    label?: string
    size?: "sm" | "md"
}

export function Spinner({ label, size = "md" }: SpinnerProps) {
    return (
        <div className={`pf-spinner-wrap pf-spinner-wrap--${size}`} role="status">
            <span className="pf-spinner" aria-hidden />
            {label ? <span className="pf-meta">{label}</span> : null}
        </div>
    )
}
