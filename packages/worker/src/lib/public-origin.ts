import type { Env } from "../env.js"

/** Request origin in local dev; WEB_APP_URL in production (matches request host when on the app domain). */
export function getPublicOrigin(env: Env, requestUrl: string): string {
    const configured =
        env.WEB_APP_URL?.trim().replace(/\/$/, "") ||
        env.WORKER_PUBLIC_URL.replace(/\/$/, "")

    try {
        const { protocol, host, hostname } = new URL(requestUrl)
        if (hostname === "localhost" || hostname === "127.0.0.1") {
            return `${protocol}//${host}`
        }
        if (configured) {
            const configuredHost = new URL(configured).hostname
            if (hostname === configuredHost) {
                return `${protocol}//${host}`
            }
        }
    } catch {
        /* fall through */
    }

    return configured
}

export function getNotionRedirectUri(env: Env, requestUrl: string): string {
    try {
        const { hostname } = new URL(requestUrl)
        if (hostname === "localhost" || hostname === "127.0.0.1") {
            return `${getPublicOrigin(env, requestUrl)}/oauth/notion/callback`
        }
    } catch {
        /* fall through */
    }

    return env.NOTION_REDIRECT_URI
}
