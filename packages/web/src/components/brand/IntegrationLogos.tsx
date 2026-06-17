import type { FC, ReactNode } from "react"
import { cn } from "../../lib/cn"
import { FRAMER_BRAND_BLUE, GOOGLE_SHEETS_ICON_SRC, NOTION_ICON_SRC } from "./brand-icons"

/** Framer symbol — path/fill unchanged from official asset. */
function FramerSymbol() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 140" className="pf-brand-icon-svg" aria-hidden>
            <path
                d="M 44.65 33.992 L 95.35 33.992 L 95.35 59.341 L 70 59.341 Z M 44.65 59.341 L 70 59.341 L 95.35 84.691 L 44.65 84.691 Z M 44.65 84.691 L 70 84.691 L 70 110.041 Z"
                fill="rgb(255,255,255)"
            />
        </svg>
    )
}

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
    bg?: string
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
        <BrandTile size={size} className={className}>
            <img
                className="pf-brand-icon-img"
                src={NOTION_ICON_SRC}
                alt=""
                width={size}
                height={size}
                loading="lazy"
                decoding="async"
            />
        </BrandTile>
    )
}

export function FramerLogo({ size = 20, className }: LogoIconProps) {
    return (
        <BrandTile bg={FRAMER_BRAND_BLUE} size={size} className={className}>
            <FramerSymbol />
        </BrandTile>
    )
}

function AirtableLogo({ size = 20, className }: LogoIconProps) {
    return (
        <BrandTile bg="#fcb400" size={size} className={className}>
            <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M12 5l7 4v2l-7 4-7-4V9l7-4z" fill="#fff" opacity="0.95" />
            </svg>
        </BrandTile>
    )
}

export function GoogleSheetsLogo({ size = 20, className }: LogoIconProps) {
    return (
        <BrandTile size={size} className={className}>
            <img
                className="pf-brand-icon-img"
                src={GOOGLE_SHEETS_ICON_SRC}
                alt=""
                width={size}
                height={size}
                loading="lazy"
                decoding="async"
            />
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
