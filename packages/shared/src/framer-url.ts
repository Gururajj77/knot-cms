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

/** Editor project id from a Framer project URL (`…/projects/{id}`). */
export function extractFramerProjectEditorId(input: string): string | null {
    try {
        const pathname = new URL(normalizeFramerProjectUrl(input)).pathname
        const match = pathname.match(/\/projects\/([^/]+)/)
        return match?.[1] ?? null
    } catch {
        return null
    }
}

/** Canonical project URL from the hashed id returned by `framer.getProjectInfo()`. */
export function buildFramerProjectUrlFromEditorId(editorId: string): string {
    const id = editorId.trim()
    if (!id) return ""
    return `https://framer.com/projects/${id}`
}
