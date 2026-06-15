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

/** Canonical worker URL for webhooks (Notion, Google Drive). */
export function getWorkerPublicUrl(env: Env): string {
    return (
        env.WORKER_PUBLIC_URL?.trim().replace(/\/$/, "") ||
        env.WEB_APP_URL?.trim().replace(/\/$/, "") ||
        ""
    )
}

/** Public HTTPS base for inbound webhooks. Use WEBHOOK_PUBLIC_URL in local dev with a tunnel. */
export function getWebhookPublicBaseUrl(env: Env): string {
    const override = env.WEBHOOK_PUBLIC_URL?.trim().replace(/\/$/, "")
    if (override) return override
    return getWorkerPublicUrl(env)
}

export function getDriveWebhookEndpointUrl(env: Env): string {
    const base = getWebhookPublicBaseUrl(env)
    return base ? `${base}/webhooks/google-drive` : "/webhooks/google-drive"
}

/** Canonical Notion webhook URL (always use the public app domain, not workers.dev). */
export function getNotionWebhookEndpointUrl(env: Env): string {
    const base = getWebhookPublicBaseUrl(env)
    return base ? `${base}/webhooks/notion` : "/webhooks/notion"
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
