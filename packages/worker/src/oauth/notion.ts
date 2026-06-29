import { Hono } from "hono"
import { readSession } from "../auth/middleware.js"
import {
    createSetupSession,
    saveSetupSessionToken,
    setupSessionBelongsToCustomer,
} from "../db.js"
import type { Env } from "../env.js"
import { resolveAuthenticatedCustomerId } from "../lib/resolve-authenticated-customer.js"
import {
    buildNotionAuthorizeUrl,
    notionOAuthRedirectHtml,
} from "../lib/notion-oauth-url.js"
import {
    exchangeNotionOAuthCode,
    NotionTokenExchangeError,
} from "../lib/notion-token-exchange.js"
import { getNotionRedirectUri, getPublicOrigin } from "../lib/public-origin.js"
import { getNotionOAuthSetupError } from "../notion-config.js"

export const notionOAuth = new Hono<{ Bindings: Env }>()

function oauthAuthRequiredHtml(message: string): string {
    return `<!DOCTYPE html><html><body style="font-family:system-ui;padding:24px;max-width:480px">
  <h2>Sign in required</h2>
  <p>${message}</p>
  <p>Open KnotCMS in your main browser window, sign in, then try connecting Notion again.</p>
</body></html>`
}

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

    const session = await readSession(c.env, c.req.header("Cookie"))
    if (!session) {
        return c.html(oauthAuthRequiredHtml("You must be signed in to KnotCMS before connecting Notion."), 401)
    }

    const customerId = await resolveAuthenticatedCustomerId(c.env, session)
    if (!customerId) {
        return c.html(oauthAuthRequiredHtml("Your KnotCMS account could not be resolved."), 401)
    }

    const requestedSessionId = c.req.query("setup_session_id")?.trim()
    let setupSessionId: string

    if (requestedSessionId) {
        const owned = await setupSessionBelongsToCustomer(c.env, requestedSessionId, customerId)
        if (!owned) {
            return c.html(
                oauthAuthRequiredHtml("This setup session is invalid or belongs to another account."),
                403
            )
        }
        setupSessionId = requestedSessionId
    } else {
        setupSessionId = await createSetupSession(c.env, customerId)
    }

    const returnTo = c.req.query("return_to")?.trim()
    const authorizeUrl = buildNotionAuthorizeUrl(c.env, c.req.url, setupSessionId, returnTo)

    // HTML redirect — some popup windows stall on empty 302 bodies.
    return c.html(notionOAuthRedirectHtml(authorizeUrl))
})

function parseNotionOAuthState(stateRaw: string): { setupSessionId: string; returnTo?: string } {
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(stateRaw)) {
        return { setupSessionId: stateRaw }
    }

    try {
        const parsed = JSON.parse(atob(stateRaw)) as { setupSessionId?: string; returnTo?: string }
        if (parsed.setupSessionId) {
            return { setupSessionId: parsed.setupSessionId, returnTo: parsed.returnTo }
        }
    } catch {
        /* legacy plain state */
    }

    return { setupSessionId: stateRaw }
}

notionOAuth.get("/callback", async c => {
    const code = c.req.query("code")
    const stateRaw = c.req.query("state")
    const error = c.req.query("error")

    if (error) {
        return c.html(`<html><body><p>Notion authorization failed: ${error}</p><script>window.close()</script></body></html>`, 400)
    }

    if (!code || !stateRaw) {
        return c.html(`<html><body><p>Missing authorization code.</p></body></html>`, 400)
    }

    const session = await readSession(c.env, c.req.header("Cookie"))
    if (!session) {
        return c.html(oauthAuthRequiredHtml("Sign in to KnotCMS, then connect Notion from the setup wizard."), 401)
    }

    const customerId = await resolveAuthenticatedCustomerId(c.env, session)
    if (!customerId) {
        return c.html(oauthAuthRequiredHtml("Your KnotCMS account could not be resolved."), 401)
    }

    const { setupSessionId, returnTo } = parseNotionOAuthState(stateRaw)
    const redirectUri = getNotionRedirectUri(c.env, c.req.url)

    let tokenData: { access_token: string; workspace_name?: string | null }
    try {
        tokenData = await exchangeNotionOAuthCode(c.env, { code, redirectUri })
    } catch (err) {
        const body = err instanceof NotionTokenExchangeError ? err.body : String(err)
        const clientId =
            err instanceof NotionTokenExchangeError ? err.clientId : c.env.NOTION_CLIENT_ID.trim()
        const hint = body.includes("invalid_client")
            ? `<p><strong>This is not a redirect URI problem.</strong> Notion rejected the OAuth client ID/secret pair.</p>
               <ol>
                 <li>Open <a href="https://www.notion.so/my-integrations">notion.com/my-integrations</a></li>
                 <li>Select your <strong>public</strong> connection (not an internal one)</li>
                 <li>Configuration tab → copy <strong>OAuth client ID</strong> (yours: <code>${clientId}</code>)</li>
                 <li>Click <strong>Regenerate</strong> OAuth client secret → copy the new secret immediately</li>
                 <li>Paste both into <code>packages/worker/.dev.vars</code> and restart <code>npm run dev:worker</code></li>
               </ol>
               <p>Redirect URI used: <code>${redirectUri}</code></p>`
            : `<p>Redirect URI used: <code>${redirectUri}</code></p>`
        return c.html(
            `<html><body style="font-family:system-ui;padding:24px;max-width:560px"><p>Token exchange failed: ${body}</p>${hint}<script>setTimeout(() => window.close(), 12000)</script></body></html>`,
            500
        )
    }

    const saved = await saveSetupSessionToken(
        c.env,
        setupSessionId,
        customerId,
        tokenData.access_token
    )
    if (!saved) {
        return c.html(
            oauthAuthRequiredHtml(
                "This setup session is invalid, expired, or belongs to another account. Start Notion connection again from KnotCMS."
            ),
            403
        )
    }

    if (returnTo) {
        const base = getPublicOrigin(c.env, c.req.url)
        const path = returnTo.startsWith("/") ? returnTo : `/${returnTo}`
        const url = new URL(`${base}${path}`)
        url.searchParams.set("setup_session_id", setupSessionId)
        url.searchParams.set("connector_id", "notion")
        return c.redirect(url.toString())
    }

    const appOrigin = getPublicOrigin(c.env, c.req.url)
    return c.html(`<!DOCTYPE html>
<html>
<head><title>Connected</title></head>
<body style="font-family: system-ui; padding: 24px; text-align: center;">
  <h2>Notion connected</h2>
  <p>You can close this window and return to Framer.</p>
  <script>
    if (window.opener) {
      window.opener.postMessage({ type: "notion-oauth-complete", setupSessionId: "${setupSessionId}" }, ${JSON.stringify(appOrigin)});
    }
    setTimeout(() => window.close(), 1500);
  </script>
</body>
</html>`)
})
