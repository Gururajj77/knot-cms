import type { Env } from "../env.js"

/** Request origin in local dev; configured WEB_APP_URL / WORKER_PUBLIC_URL in production. */
export function getPublicOrigin(env: Env, requestUrl: string): string {
    try {
        const { protocol, host, hostname } = new URL(requestUrl)
        if (hostname === "localhost" || hostname === "127.0.0.1") {
            return `${protocol}//${host}`
        }
    } catch {
        /* fall through */
    }

    const web = env.WEB_APP_URL?.trim().replace(/\/$/, "")
    if (web) return web

    return env.WORKER_PUBLIC_URL.replace(/\/$/, "")
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
