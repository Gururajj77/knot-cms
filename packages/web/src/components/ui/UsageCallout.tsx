import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import { cn } from "../../lib/cn"
import { buttonClass } from "./Button"

export type UsageCalloutTone = "info" | "warning" | "error"

export interface UsageCalloutAction {
    label: string
    href: string
    variant?: "primary" | "secondary"
    external?: boolean
}

interface UsageCalloutProps {
    tone: UsageCalloutTone
    icon: ReactNode
    title: string
    description: string
    meter?: { value: number; max: number; label: string }
    actions?: UsageCalloutAction[]
}

export function UsageCallout({
    tone,
    icon,
    title,
    description,
    meter,
    actions = [],
}: UsageCalloutProps) {
    const meterPercent =
        meter && meter.max > 0 ? Math.min(100, Math.round((meter.value / meter.max) * 100)) : 0

    return (
        <div className={cn("pf-usage-callout", `pf-usage-callout--${tone}`)} role="status">
            <div className="pf-usage-callout-icon" aria-hidden>
                {icon}
            </div>
            <div className="pf-usage-callout-body">
                <p className="pf-usage-callout-title">{title}</p>
                <p className="pf-usage-callout-desc">{description}</p>
                {meter ? (
                    <div className="pf-usage-meter">
                        <div className="pf-usage-meter-track" aria-hidden>
                            <div
                                className="pf-usage-meter-fill"
                                style={{ width: `${meterPercent}%` }}
                            />
                        </div>
                        <span className="pf-usage-meter-label">{meter.label}</span>
                    </div>
                ) : null}
            </div>
            {actions.length > 0 ? (
                <div className="pf-usage-callout-actions">
                    {actions.map(action =>
                        action.external ? (
                            <a
                                key={action.href + action.label}
                                href={action.href}
                                className={buttonClass(action.variant ?? "secondary")}
                                target="_blank"
                                rel="noreferrer"
                            >
                                {action.label}
                            </a>
                        ) : (
                            <Link
                                key={action.href + action.label}
                                to={action.href}
                                className={buttonClass(action.variant ?? "secondary")}
                            >
                                {action.label}
                            </Link>
                        )
                    )}
                </div>
            ) : null}
        </div>
    )
}
