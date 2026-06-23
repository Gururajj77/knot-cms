import {
    GOOGLE_SHEETS_COMING_SOON_MESSAGE,
    GOOGLE_SHEETS_CONNECTOR_LAUNCHED,
} from "@knotcms/shared"
import { Hono } from "hono"
import { readSession } from "../auth/middleware.js"
import {
    createSetupSession,
    saveSetupSessionToken,
    setupSessionBelongsToCustomer,
} from "../db.js"
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
import { getPublicOrigin } from "../lib/public-origin.js"
import { resolveAuthenticatedCustomerId } from "../lib/resolve-authenticated-customer.js"

export const googleSheetsOAuth = new Hono<{ Bindings: Env }>()

function oauthAuthRequiredHtml(message: string): string {
    return `<!DOCTYPE html><html><body style="font-family:system-ui;padding:24px;max-width:480px">
  <h2>Sign in required</h2>
  <p>${message}</p>
  <p>Open KnotCMS in your main browser window, sign in, then try connecting Google Sheets again.</p>
</body></html>`
}

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

    const session = await readSession(c.env, c.req.header("Cookie"))
    if (!session) {
        return c.html(
            oauthAuthRequiredHtml("You must be signed in to KnotCMS before connecting Google Sheets."),
            401
        )
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

    const session = await readSession(c.env, c.req.header("Cookie"))
    if (!session) {
        return c.html(
            oauthAuthRequiredHtml("Sign in to KnotCMS, then connect Google Sheets from the setup wizard."),
            401
        )
    }

    const customerId = await resolveAuthenticatedCustomerId(c.env, session)
    if (!customerId) {
        return c.html(oauthAuthRequiredHtml("Your KnotCMS account could not be resolved."), 401)
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

    const saved = await saveSetupSessionToken(
        c.env,
        setupSessionId,
        customerId,
        serializeGoogleSourceToken(tokenData)
    )
    if (!saved) {
        return c.html(
            oauthAuthRequiredHtml(
                "This setup session is invalid, expired, or belongs to another account. Start Google Sheets connection again from KnotCMS."
            ),
            403
        )
    }

    if (returnTo) {
        return c.redirect(googleSheetsReturnRedirect(c.env, c.req.url, returnTo, setupSessionId))
    }

    const appOrigin = getPublicOrigin(c.env, c.req.url)
    return c.html(googleSheetsOAuthCompleteHtml(setupSessionId, appOrigin))
})
