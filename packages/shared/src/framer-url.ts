/** Hostnames allowed for Framer Server API project URLs. */
const ALLOWED_FRAMER_HOSTS = new Set(["framer.com", "www.framer.com"])

export function normalizeFramerProjectUrl(input: string): string {
    const trimmed = input.trim()
    if (!trimmed) return trimmed

    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
    return withProtocol.replace(/\/$/, "")
}

export function isAllowedFramerProjectUrl(input: string): boolean {
    try {
        const url = new URL(normalizeFramerProjectUrl(input))
        if (url.protocol !== "https:") return false

        const host = url.hostname.toLowerCase()
        if (ALLOWED_FRAMER_HOSTS.has(host)) return true
        if (host.endsWith(".framer.com")) return true

        return false
    } catch {
        return false
    }
}

export function framerProjectUrlErrorMessage(): string {
    return "Use your Framer project URL from the browser, e.g. https://framer.com/projects/…"
}

/** Path segment after `/projects/` (e.g. `MySite--aabbccdd`). */
export function extractFramerProjectSlug(input: string): string | null {
    try {
        const pathname = new URL(normalizeFramerProjectUrl(input)).pathname
        const match = pathname.match(/\/projects\/([^/]+)/)
        if (!match?.[1]) return null
        try {
            return decodeURIComponent(match[1])
        } catch {
            return match[1]
        }
    } catch {
        return null
    }
}

/** @deprecated Use extractFramerProjectSlug */
export function extractFramerProjectEditorId(input: string): string | null {
    return extractFramerProjectSlug(input)
}

/**
 * Stable hash id used to match `framer.getProjectInfo().id` to Server API URLs.
 * Browser URLs look like `https://framer.com/projects/ProjectName--{hash}`.
 */
export function framerProjectHashIdFromSlug(slug: string): string | null {
    const trimmed = slug.trim()
    if (!trimmed) return null
    const separator = trimmed.lastIndexOf("--")
    return separator >= 0 ? trimmed.slice(separator + 2) : trimmed
}

export function framerProjectHashIdFromUrl(input: string): string | null {
    const slug = extractFramerProjectSlug(input)
    return slug ? framerProjectHashIdFromSlug(slug) : null
}

/** Best-effort Server API URL from plugin `getProjectInfo().id` (hash-only). */
export function buildFramerProjectUrlFromEditorId(editorId: string): string {
    const id = editorId.trim()
    if (!id) return ""
    return `https://framer.com/projects/${id}`
}
