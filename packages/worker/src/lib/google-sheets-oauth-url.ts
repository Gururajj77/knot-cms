import {
    GOOGLE_DRIVE_READONLY_SCOPE,
    GOOGLE_SHEETS_READONLY_SCOPE,
} from "@knotcms/shared"
import type { Env } from "../env.js"
import { getGoogleSheetsRedirectUri } from "../google-sheets-config.js"
import { getPublicOrigin } from "./public-origin.js"

export interface GoogleOAuthState {
    setupSessionId: string
    returnTo?: string
}

export function buildGoogleSheetsAuthorizeUrl(
    env: Env,
    requestUrl: string,
    setupSessionId: string,
    returnTo?: string
): string {
    const redirectUri = getGoogleSheetsRedirectUri(env, requestUrl)
    const state = returnTo
        ? btoa(JSON.stringify({ setupSessionId, returnTo } satisfies GoogleOAuthState))
        : setupSessionId

    const params = new URLSearchParams({
        client_id: env.GOOGLE_SHEETS_CLIENT_ID.trim(),
        redirect_uri: redirectUri,
        response_type: "code",
        scope: [GOOGLE_SHEETS_READONLY_SCOPE, GOOGLE_DRIVE_READONLY_SCOPE].join(" "),
        access_type: "offline",
        prompt: "consent",
        state,
    })

    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

export function googleSheetsOAuthRedirectHtml(authorizeUrl: string): string {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Redirecting…</title></head>
<body><p>Redirecting to Google…</p><script>location.replace(${JSON.stringify(authorizeUrl)})</script></body></html>`
}

export function parseGoogleOAuthState(stateRaw: string): GoogleOAuthState {
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(stateRaw)) {
        return { setupSessionId: stateRaw }
    }
    try {
        const parsed = JSON.parse(atob(stateRaw)) as GoogleOAuthState
        if (parsed.setupSessionId) return parsed
    } catch {
        /* legacy */
    }
    return { setupSessionId: stateRaw }
}

export function googleSheetsOAuthCompleteHtml(setupSessionId: string): string {
    return `<!DOCTYPE html>
<html>
<head><title>Connected</title></head>
<body style="font-family: system-ui; padding: 24px; text-align: center;">
  <h2>Google Sheets connected</h2>
  <p>You can close this window and return to KnotCMS.</p>
  <script>
    if (window.opener) {
      window.opener.postMessage({ type: "google-sheets-oauth-complete", setupSessionId: "${setupSessionId}" }, "*");
    }
    setTimeout(() => window.close(), 1500);
  </script>
</body>
</html>`
}

export function googleSheetsReturnRedirect(
    env: Env,
    requestUrl: string,
    returnTo: string,
    setupSessionId: string
): string {
    const base = getPublicOrigin(env, requestUrl)
    const path = returnTo.startsWith("/") ? returnTo : `/${returnTo}`
    const url = new URL(`${base}${path}`)
    url.searchParams.set("setup_session_id", setupSessionId)
    return url.toString()
}
