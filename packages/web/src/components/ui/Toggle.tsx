import { useId, type ReactNode } from "react"
import { cn } from "../../lib/cn"

interface ToggleProps {
    checked: boolean
    onChange: (checked: boolean) => void
    disabled?: boolean
    id?: string
    "aria-labelledby"?: string
}

export function Toggle({ checked, onChange, disabled, id, "aria-labelledby": labelledBy }: ToggleProps) {
    return (
        <button
            type="button"
            role="switch"
            id={id}
            aria-checked={checked}
            aria-labelledby={labelledBy}
            disabled={disabled}
            className={cn("pf-toggle", checked && "pf-toggle--on")}
            onClick={() => onChange(!checked)}
        >
            <span className="pf-toggle-thumb" aria-hidden />
        </button>
    )
}

interface ToggleRowProps {
    label: ReactNode
    description?: ReactNode
    checked: boolean
    onChange: (checked: boolean) => void
    disabled?: boolean
}

export function ToggleRow({ label, description, checked, onChange, disabled }: ToggleRowProps) {
    const labelId = useId()

    return (
        <div className="pf-toggle-row">
            <div className="pf-toggle-row-text">
                <span id={labelId} className="pf-toggle-row-label">
                    {label}
                </span>
                {description ? <span className="pf-toggle-row-desc">{description}</span> : null}
            </div>
            <Toggle
                checked={checked}
                onChange={onChange}
                disabled={disabled}
                aria-labelledby={labelId}
            />
        </div>
    )
}
