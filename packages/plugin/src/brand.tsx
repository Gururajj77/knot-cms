export const PRODUCT_NAME = "PublishFlow"

interface WordmarkProps {
    size?: "sm" | "lg"
    className?: string
}

/** Text-only brand mark until a logo exists. */
export function Wordmark({ size = "sm", className }: WordmarkProps) {
    return (
        <span
            className={["nf-wordmark", `nf-wordmark--${size}`, className].filter(Boolean).join(" ")}
            aria-label={PRODUCT_NAME}
        >
            Publish<span className="nf-wordmark-accent">Flow</span>
        </span>
    )
}
