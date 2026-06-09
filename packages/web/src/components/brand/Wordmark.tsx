import { cn } from "../../lib/cn"

export const PRODUCT_NAME = "PublishFlow"

interface WordmarkProps {
    size?: "sm" | "md" | "lg"
    className?: string
}

export function Wordmark({ size = "md", className }: WordmarkProps) {
    return (
        <span className={cn("pf-wordmark", `pf-wordmark--${size}`, className)} aria-label={PRODUCT_NAME}>
            Publish<span className="pf-wordmark-accent">Flow</span>
        </span>
    )
}
