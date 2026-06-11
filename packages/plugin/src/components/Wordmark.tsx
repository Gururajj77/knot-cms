import { PRODUCT_NAME } from "@knotcms/shared"
import { Logo } from "./Logo"

export { PRODUCT_NAME }

interface WordmarkProps {
    size?: "md"
    className?: string
}

export function Wordmark({ size = "md", className }: WordmarkProps) {
    return (
        <span
            className={["pf-wordmark", `pf-wordmark--${size}`, className].filter(Boolean).join(" ")}
            aria-label={PRODUCT_NAME}
        >
            <Logo size={22} />
            <span className="pf-wordmark-text">{PRODUCT_NAME}</span>
        </span>
    )
}
