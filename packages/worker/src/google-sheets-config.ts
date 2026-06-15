import type { Env } from "../env.js"

export function getGoogleSheetsRedirectUri(env: Env, requestUrl?: string): string {
    const configured = env.GOOGLE_SHEETS_REDIRECT_URI?.trim()
    if (configured) return configured
    if (requestUrl) {
        const url = new URL(requestUrl)
        return `${url.origin}/oauth/google-sheets/callback`
    }
    return ""
}

export function getGoogleSheetsOAuthSetupError(env: Env): string | null {
    if (!env.GOOGLE_SHEETS_CLIENT_ID?.trim()) {
        return "GOOGLE_SHEETS_CLIENT_ID is not configured."
    }
    if (!env.GOOGLE_SHEETS_CLIENT_SECRET?.trim()) {
        return "GOOGLE_SHEETS_CLIENT_SECRET is not configured."
    }
    if (!getGoogleSheetsRedirectUri(env)) {
        return "GOOGLE_SHEETS_REDIRECT_URI is not configured."
    }
    return null
}
