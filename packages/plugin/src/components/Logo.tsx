interface LogoProps {
    size?: number
    className?: string
}

export function Logo({ size = 24, className }: LogoProps) {
    return (
        <img
            src="/brand/knotcms-mark.svg"
            alt=""
            width={size}
            height={size}
            aria-hidden
            className={["pf-logo", className].filter(Boolean).join(" ")}
            loading="eager"
            decoding="async"
        />
    )
}
