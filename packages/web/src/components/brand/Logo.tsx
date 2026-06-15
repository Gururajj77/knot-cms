import { cn } from "../../lib/cn"

interface LogoProps {
    size?: number
    className?: string
}

export function Logo({ size = 24, className }: LogoProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 64 64"
            fill="none"
            aria-hidden
            className={cn("pf-logo", className)}
        >
            <rect width="64" height="64" rx="18" fill="var(--pf-accent)" />
            <path
                d="M18 34c0-8.837 7.163-16 16-16 4.2 0 8.02 1.61 10.88 4.25M46 30c0 8.837-7.163 16-16 16-4.2 0-8.02-1.61-10.88-4.25"
                stroke="#fff"
                strokeWidth="3.25"
                strokeLinecap="round"
            />
            <circle cx="32" cy="32" r="3.5" fill="#fff" />
        </svg>
    )
}
