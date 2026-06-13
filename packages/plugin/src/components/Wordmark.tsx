import { PRODUCT_NAME } from "@knotcms/shared"
import { Logo } from "./Logo"

export { PRODUCT_NAME }

interface WordmarkProps {
    size?: "sm" | "md"
    className?: string
}

const logoSizes = { sm: 20, md: 24 }

export function Wordmark({ size = "md", className }: WordmarkProps) {
    return (
        <span
            className={["pf-wordmark", `pf-wordmark--${size}`, className].filter(Boolean).join(" ")}
            aria-label={PRODUCT_NAME}
        >
            <Logo size={logoSizes[size]} className="pf-wordmark-logo" />
            <span className="pf-wordmark-text">{PRODUCT_NAME}</span>
        </span>
    )
}
