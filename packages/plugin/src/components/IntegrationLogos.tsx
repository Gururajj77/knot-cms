import type { ReactNode } from "react"
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
    const dim = Math.round(size * 1.55)
    return (
        <span
            className={["pf-brand-tile", className].filter(Boolean).join(" ")}
            style={{ width: dim, height: dim, background: bg }}
            aria-hidden
        >
            {children}
        </span>
    )
}

export function NotionLogo({ size = 18, className }: LogoIconProps) {
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

export function GoogleSheetsLogo({ size = 18, className }: LogoIconProps) {
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

export function FramerLogo({ size = 18, className }: LogoIconProps) {
    return (
        <BrandTile bg={FRAMER_BRAND_BLUE} size={size} className={className}>
            <FramerSymbol />
        </BrandTile>
    )
}
