interface LogoProps {
    size?: number
    className?: string
}

export function Logo({ size = 24, className }: LogoProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
            className={className}
        >
            <rect width="24" height="24" rx="6" fill="var(--pf-accent)" />
            <path d="M6 8h5v8H6V8z" fill="#fff" opacity="0.55" />
            <path d="M11 6h7v6h-7V6z" fill="#fff" />
            <path d="M11 12h7v6h-7v-6z" fill="#fff" opacity="0.8" />
        </svg>
    )
}
