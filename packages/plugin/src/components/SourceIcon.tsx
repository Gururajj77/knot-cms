import type { SourceProvider } from "@knotcms/shared"
import { GoogleSheetsLogo, NotionLogo } from "./IntegrationLogos"

interface SourceIconProps {
    provider: SourceProvider
    size?: number
}

export function SourceIcon({ provider, size = 18 }: SourceIconProps) {
    if (provider === "google_sheets") {
        return <GoogleSheetsLogo size={size} />
    }
    return <NotionLogo size={size} />
}
