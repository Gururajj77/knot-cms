import { Hono } from "hono"
import { createSetupSession, saveSetupSessionToken } from "../db.js"
import type { Env } from "../env.js"
import { getNotionOAuthSetupError } from "../notion-config.js"

const NOTION_AUTH_URL = "https://api.notion.com/v1/oauth/authorize"
const NOTION_TOKEN_URL = "https://api.notion.com/v1/oauth/token"

export const notionOAuth = new Hono<{ Bindings: Env }>()

notionOAuth.get("/start", async c => {
    const configError = getNotionOAuthSetupError(c.env)
    if (configError) {
        return c.html(
            `<html><body style="font-family:system-ui;padding:24px;max-width:480px">
            <h2>Notion OAuth not configured</h2>
            <p>${configError}</p>
            <ol>
              <li>Open <a href="https://www.notion.so/my-integrations">notion.com/my-integrations</a></li>
              <li>Create a <strong>Public</strong> integration with OAuth</li>
              <li>Redirect URI: <code>${c.env.NOTION_REDIRECT_URI}</code></li>
              <li>Paste Client ID + Secret into <code>packages/worker/.dev.vars</code></li>
              <li>Restart <code>npm run dev</code> in the worker folder</li>
            </ol>
            </body></html>`,
            503
        )
    }

    const setupSessionId = c.req.query("setup_session_id") ?? (await createSetupSession(c.env))
    const state = setupSessionId

    const params = new URLSearchParams({
        client_id: c.env.NOTION_CLIENT_ID,
        response_type: "code",
        owner: "user",
        redirect_uri: c.env.NOTION_REDIRECT_URI,
        state,
    })

    return c.redirect(`${NOTION_AUTH_URL}?${params.toString()}`)
})

notionOAuth.get("/callback", async c => {
    const code = c.req.query("code")
    const state = c.req.query("state")
    const error = c.req.query("error")

    if (error) {
        return c.html(`<html><body><p>Notion authorization failed: ${error}</p><script>window.close()</script></body></html>`, 400)
    }

    if (!code || !state) {
        return c.html(`<html><body><p>Missing authorization code.</p></body></html>`, 400)
    }

    const tokenResponse = await fetch(NOTION_TOKEN_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${btoa(`${c.env.NOTION_CLIENT_ID}:${c.env.NOTION_CLIENT_SECRET}`)}`,
        },
        body: JSON.stringify({
            grant_type: "authorization_code",
            code,
            redirect_uri: c.env.NOTION_REDIRECT_URI,
        }),
    })

    if (!tokenResponse.ok) {
        const body = await tokenResponse.text()
        return c.html(`<html><body><p>Token exchange failed: ${body}</p></body></html>`, 500)
    }

    const tokenData = (await tokenResponse.json()) as {
        access_token: string
        workspace_name?: string
    }

    await saveSetupSessionToken(c.env, state, tokenData.access_token)

    return c.html(`<!DOCTYPE html>
<html>
<head><title>Connected</title></head>
<body style="font-family: system-ui; padding: 24px; text-align: center;">
  <h2>Notion connected</h2>
  <p>You can close this window and return to Framer.</p>
  <script>
    if (window.opener) {
      window.opener.postMessage({ type: "notion-oauth-complete", setupSessionId: "${state}" }, "*");
    }
    setTimeout(() => window.close(), 1500);
  </script>
</body>
</html>`)
})
