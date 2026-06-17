import type { Env } from "../env.js"
import { getNotionRedirectUri } from "./public-origin.js"

const NOTION_AUTH_URL = "https://api.notion.com/v1/oauth/authorize"

function buildNotionOAuthState(setupSessionId: string, returnTo?: string): string {
    if (returnTo) {
        return btoa(JSON.stringify({ setupSessionId, returnTo }))
    }
    return setupSessionId
}

export function buildNotionAuthorizeUrl(
    env: Env,
    requestUrl: string,
    setupSessionId: string,
    returnTo?: string
): string {
    const redirectUri = getNotionRedirectUri(env, requestUrl)
    const state = buildNotionOAuthState(setupSessionId, returnTo)
    const params = new URLSearchParams({
        client_id: env.NOTION_CLIENT_ID.trim(),
        response_type: "code",
        owner: "user",
        redirect_uri: redirectUri,
        state,
    })
    return `${NOTION_AUTH_URL}?${params.toString()}`
}

export function notionOAuthRedirectHtml(authorizeUrl: string): string {
    const safeUrl = JSON.stringify(authorizeUrl)
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Redirecting to Notion</title>
  <meta http-equiv="refresh" content="0;url=${authorizeUrl.replace(/"/g, "&quot;")}">
</head>
<body style="font-family:system-ui;padding:24px;text-align:center;color:#111">
  <p>Redirecting to Notion…</p>
  <p><a href="${authorizeUrl.replace(/"/g, "&quot;")}">Click here</a> if you are not redirected.</p>
  <script>location.replace(${safeUrl})</script>
</body>
</html>`
}
