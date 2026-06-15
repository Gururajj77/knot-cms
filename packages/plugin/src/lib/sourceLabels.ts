import type { SourceProvider } from "@knotcms/shared"

export function sourceProviderLabel(provider: SourceProvider): string {
    switch (provider) {
        case "google_sheets":
            return "Google Sheets"
        case "notion":
        default:
            return "Notion"
    }
}
