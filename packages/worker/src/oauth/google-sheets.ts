import {
    GOOGLE_SHEETS_COMING_SOON_MESSAGE,
    GOOGLE_SHEETS_CONNECTOR_LAUNCHED,
} from "@knotcms/shared"
import { Hono } from "hono"
import { createSetupSession, saveSetupSessionToken } from "../db.js"
import type { Env } from "../env.js"
import { getGoogleSheetsRedirectUri, getGoogleSheetsOAuthSetupError } from "../google-sheets-config.js"
import {
    buildGoogleSheetsAuthorizeUrl,
    googleSheetsOAuthCompleteHtml,
    googleSheetsOAuthRedirectHtml,
    googleSheetsReturnRedirect,
    parseGoogleOAuthState,
} from "../lib/google-sheets-oauth-url.js"
import {
    exchangeGoogleOAuthCode,
    serializeGoogleSourceToken,
} from "../lib/google-token.js"

export const googleSheetsOAuth = new Hono<{ Bindings: Env }>()

googleSheetsOAuth.get("/start", async c => {
    if (!GOOGLE_SHEETS_CONNECTOR_LAUNCHED) {
        return c.html(
            `<html><body style="font-family:system-ui;padding:24px;max-width:520px">
            <h2>Google Sheets — coming soon</h2>
            <p>${GOOGLE_SHEETS_COMING_SOON_MESSAGE}</p>
            </body></html>`,
            503
        )
    }

    const configError = getGoogleSheetsOAuthSetupError(c.env)
    if (configError) {
        return c.html(
            `<html><body style="font-family:system-ui;padding:24px;max-width:520px">
            <h2>Google Sheets OAuth not configured</h2>
            <p>${configError}</p>
            <p>Add <code>GOOGLE_SHEETS_CLIENT_ID</code>, <code>GOOGLE_SHEETS_CLIENT_SECRET</code>, and
            <code>GOOGLE_SHEETS_REDIRECT_URI</code> to <code>packages/worker/.dev.vars</code>.</p>
            </body></html>`,
            503
        )
    }

    const setupSessionId = c.req.query("setup_session_id") ?? (await createSetupSession(c.env))
    const returnTo = c.req.query("return_to")?.trim()
    const authorizeUrl = buildGoogleSheetsAuthorizeUrl(c.env, c.req.url, setupSessionId, returnTo)
    return c.html(googleSheetsOAuthRedirectHtml(authorizeUrl))
})

googleSheetsOAuth.get("/callback", async c => {
    const code = c.req.query("code")
    const stateRaw = c.req.query("state")
    const error = c.req.query("error")

    if (error) {
        return c.html(
            `<html><body><p>Google authorization failed: ${error}</p><script>window.close()</script></body></html>`,
            400
        )
    }

    if (!code || !stateRaw) {
        return c.html(`<html><body><p>Missing authorization code.</p></body></html>`, 400)
    }

    const { setupSessionId, returnTo } = parseGoogleOAuthState(stateRaw)
    const redirectUri = getGoogleSheetsRedirectUri(c.env, c.req.url)

    let tokenData
    try {
        tokenData = await exchangeGoogleOAuthCode(c.env, code, redirectUri)
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        return c.html(`<html><body><p>${message}</p></body></html>`, 500)
    }

    await saveSetupSessionToken(c.env, setupSessionId, serializeGoogleSourceToken(tokenData))

    if (returnTo) {
        return c.redirect(googleSheetsReturnRedirect(c.env, c.req.url, returnTo, setupSessionId))
    }

    return c.html(googleSheetsOAuthCompleteHtml(setupSessionId))
})
