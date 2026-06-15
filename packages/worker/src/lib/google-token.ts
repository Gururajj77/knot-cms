import type { Env } from "../env.js"
import { requireGoogleSheetsOAuthEnv } from "../google-sheets-config.js"

export interface GoogleSourceToken {
    accessToken: string
    refreshToken: string | null
    expiresAt: number
}

export function isGoogleSourceToken(raw: string): boolean {
    return raw.trimStart().startsWith("{")
}

export function parseGoogleSourceToken(raw: string): GoogleSourceToken | string {
    if (!isGoogleSourceToken(raw)) return raw
    try {
        const parsed = JSON.parse(raw) as GoogleSourceToken
        if (parsed.accessToken) return parsed
    } catch {
        /* fall through */
    }
    return raw
}

export function serializeGoogleSourceToken(token: GoogleSourceToken): string {
    return JSON.stringify(token)
}

export async function exchangeGoogleOAuthCode(
    env: Env,
    code: string,
    redirectUri: string
): Promise<GoogleSourceToken> {
    const oauth = requireGoogleSheetsOAuthEnv(env)
    const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            code,
            client_id: oauth.GOOGLE_SHEETS_CLIENT_ID,
            client_secret: oauth.GOOGLE_SHEETS_CLIENT_SECRET,
            redirect_uri: redirectUri,
            grant_type: "authorization_code",
        }),
    })

    const body = await response.text()
    if (!response.ok) {
        throw new Error(`Google token exchange failed: ${body}`)
    }

    const data = JSON.parse(body) as {
        access_token: string
        refresh_token?: string
        expires_in: number
    }

    return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token ?? null,
        expiresAt: Date.now() + data.expires_in * 1000 - 60_000,
    }
}

export async function refreshGoogleAccessToken(
    env: Env,
    token: GoogleSourceToken
): Promise<GoogleSourceToken> {
    if (!token.refreshToken) return token
    if (token.expiresAt > Date.now()) return token

    const oauth = requireGoogleSheetsOAuthEnv(env)
    const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            client_id: oauth.GOOGLE_SHEETS_CLIENT_ID,
            client_secret: oauth.GOOGLE_SHEETS_CLIENT_SECRET,
            refresh_token: token.refreshToken,
            grant_type: "refresh_token",
        }),
    })

    const body = await response.text()
    if (!response.ok) {
        throw new Error(`Google token refresh failed: ${body}`)
    }

    const data = JSON.parse(body) as { access_token: string; expires_in: number }
    return {
        accessToken: data.access_token,
        refreshToken: token.refreshToken,
        expiresAt: Date.now() + data.expires_in * 1000 - 60_000,
    }
}

export async function resolveGoogleAccessToken(
    env: Env,
    raw: string
): Promise<{ accessToken: string; updatedToken?: GoogleSourceToken }> {
    const parsed = parseGoogleSourceToken(raw)
    if (typeof parsed === "string") {
        return { accessToken: parsed }
    }
    const refreshed = await refreshGoogleAccessToken(env, parsed)
    return {
        accessToken: refreshed.accessToken,
        updatedToken: refreshed.accessToken !== parsed.accessToken ? refreshed : undefined,
    }
}
