import type { ReactNode } from "react"
import { cn } from "../../lib/cn"

type BannerTone = "error" | "info" | "success"

interface BannerProps {
    tone: BannerTone
    children: ReactNode
    className?: string
}

export function Banner({ tone, children, className }: BannerProps) {
    return <div className={cn("pf-banner", `pf-banner--${tone}`, className)}>{children}</div>
}
