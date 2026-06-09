import type { FC, ReactNode } from "react"
import { cn } from "../../lib/cn"

interface LogoIconProps {
    size?: number
    className?: string
}

function BrandTile({
    children,
    bg,
    size = 20,
    className,
}: {
    children: ReactNode
    bg: string
    size?: number
    className?: string
}) {
    const dim = Math.round(size * 1.6)
    return (
        <span
            className={cn("pf-brand-tile", className)}
            style={{ width: dim, height: dim, background: bg }}
            aria-hidden
        >
            {children}
        </span>
    )
}

export function NotionLogo({ size = 20, className }: LogoIconProps) {
    return (
        <BrandTile bg="#000" size={size} className={className}>
            <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
                <path
                    d="M5 4.5h14l.75 1.25v14.5L19 21.5H5L4.25 20.25V5.75L5 4.5z"
                    fill="#fff"
                    stroke="#fff"
                    strokeWidth="0.5"
                />
                <path
                    d="M8 8h8M8 11.5h6.5M8 15h4"
                    stroke="#000"
                    strokeWidth="1.25"
                    strokeLinecap="round"
                />
            </svg>
        </BrandTile>
    )
}

export function FramerLogo({ size = 20, className }: LogoIconProps) {
    return (
        <BrandTile bg="#0055FF" size={size} className={className}>
            <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
                <path d="M5 5h14v6H11V5z" fill="#fff" />
                <path d="M5 11h6v8H5v-8z" fill="#fff" opacity="0.65" />
                <path d="M11 11h8v8h-8v-8z" fill="#fff" opacity="0.85" />
            </svg>
        </BrandTile>
    )
}

export function AirtableLogo({ size = 20, className }: LogoIconProps) {
    return (
        <BrandTile bg="#fcb400" size={size} className={className}>
            <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
                <path d="M12 5l7 4v2l-7 4-7-4V9l7-4z" fill="#fff" opacity="0.95" />
            </svg>
        </BrandTile>
    )
}

export function GoogleSheetsLogo({ size = 20, className }: LogoIconProps) {
    return (
        <BrandTile bg="#0f9d58" size={size} className={className}>
            <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
                <rect x="7" y="8" width="10" height="1.5" rx="0.5" fill="#fff" />
                <rect x="7" y="11.5" width="10" height="1.5" rx="0.5" fill="#fff" opacity="0.8" />
                <rect x="7" y="15" width="6" height="1.5" rx="0.5" fill="#fff" opacity="0.8" />
            </svg>
        </BrandTile>
    )
}

export type ConnectorLogoId = "notion" | "airtable" | "google_sheets" | "framer"

const CONNECTOR_LOGOS: Record<ConnectorLogoId, FC<LogoIconProps>> = {
    notion: NotionLogo,
    airtable: AirtableLogo,
    google_sheets: GoogleSheetsLogo,
    framer: FramerLogo,
}

export function ConnectorLogo({
    id,
    size = 20,
    className,
}: {
    id: ConnectorLogoId
    size?: number
    className?: string
}) {
    const Icon = CONNECTOR_LOGOS[id]
    return <Icon size={size} className={className} />
}
