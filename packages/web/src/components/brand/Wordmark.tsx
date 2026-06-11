import { PRODUCT_NAME } from "@knotcms/shared"
import { cn } from "../../lib/cn"
import { Logo } from "./Logo"

export { PRODUCT_NAME }

interface WordmarkProps {
    size?: "sm" | "md" | "lg"
    showLogo?: boolean
    className?: string
}

const logoSizes = { sm: 20, md: 24, lg: 28 }

export function Wordmark({ size = "md", showLogo = true, className }: WordmarkProps) {
    return (
        <span className={cn("pf-wordmark", `pf-wordmark--${size}`, className)} aria-label={PRODUCT_NAME}>
            {showLogo ? <Logo size={logoSizes[size]} className="pf-wordmark-logo" /> : null}
            <span className="pf-wordmark-text">{PRODUCT_NAME}</span>
        </span>
    )
}
