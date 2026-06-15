const MINUTE_MS = 60_000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS

export function formatRelativeTime(iso: string | null): string {
    if (!iso) return "Never"

    const then = Date.parse(iso)
    if (Number.isNaN(then)) return "Unknown"

    const diffMs = Date.now() - then
    if (diffMs < MINUTE_MS) return "Just now"
    if (diffMs < HOUR_MS) {
        const minutes = Math.floor(diffMs / MINUTE_MS)
        return `${minutes}m ago`
    }
    if (diffMs < DAY_MS) {
        const hours = Math.floor(diffMs / HOUR_MS)
        return `${hours}h ago`
    }
    const days = Math.floor(diffMs / DAY_MS)
    if (days < 14) return `${days}d ago`

    return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(then)
}
