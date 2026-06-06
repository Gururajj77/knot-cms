import type { Env } from "../env.js"

export function getGoogleOAuthSetupError(env: Env): string | null {
    if (!env.GOOGLE_CLIENT_ID?.trim() || !env.GOOGLE_CLIENT_SECRET?.trim()) {
        return "Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET."
    }

    if (!env.GOOGLE_REDIRECT_URI?.trim()) {
        return "GOOGLE_REDIRECT_URI is missing."
    }

    return null
}

export function isAuthDevAllowAny(env: Env): boolean {
    return env.AUTH_DEV_ALLOW_ANY === "true"
}
