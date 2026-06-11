import {
    createSessionToken,
    sessionExpiryFromNow,
} from "@knotcms/shared"
import { Hono } from "hono"
import { ensureCustomerForEmail, isCustomerEntitled } from "../db/customers.js"
import type { Env } from "../env.js"
import { getGoogleOAuthSetupError, isAuthDevAllowAny } from "../auth/google-config.js"
import { SESSION_COOKIE, getSessionSecret, sessionCookieFlags } from "../auth/middleware.js"
import { getPublicOrigin } from "../lib/public-origin.js"

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"

function safeReturnTo(env: Env, returnTo: string | undefined, origin: string): string {
    if (!returnTo) return `${origin}/`
    try {
        const url = new URL(returnTo, origin)
        const base = new URL(origin)
        if (url.origin !== base.origin && !returnTo.startsWith("/")) {
            return `${origin}/`
        }
        return returnTo.startsWith("/") ? `${origin}${returnTo}` : url.toString()
    } catch {
        return `${origin}/`
    }
}

export const googleOAuth = new Hono<{ Bindings: Env }>()

googleOAuth.get("/start", async c => {
    const configError = getGoogleOAuthSetupError(c.env)
    if (configError) {
        return c.html(
            `<html><body style="font-family:system-ui;padding:24px;max-width:480px">
            <h2>Google OAuth not configured</h2>
            <p>${configError}</p>
            </body></html>`,
            503
        )
    }

    const origin = getPublicOrigin(c.env, c.req.url)
    const returnTo = safeReturnTo(c.env, c.req.query("return_to") ?? undefined, origin)
    const state = btoa(JSON.stringify({ returnTo, nonce: crypto.randomUUID() }))

    const params = new URLSearchParams({
        client_id: c.env.GOOGLE_CLIENT_ID,
        response_type: "code",
        redirect_uri: c.env.GOOGLE_REDIRECT_URI,
        scope: "openid email profile",
        state,
        prompt: "select_account",
    })

    return c.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`)
})

googleOAuth.get("/callback", async c => {
    const configError = getGoogleOAuthSetupError(c.env)
    if (configError) {
        return c.text(configError, 503)
    }

    const code = c.req.query("code")
    const stateRaw = c.req.query("state")
    const error = c.req.query("error")

    if (error) {
        return c.html(`<html><body><p>Google sign-in failed: ${error}</p></body></html>`, 400)
    }

    if (!code || !stateRaw) {
        return c.html(`<html><body><p>Missing authorization code.</p></body></html>`, 400)
    }

    const origin = getPublicOrigin(c.env, c.req.url)
    let returnTo = safeReturnTo(c.env, undefined, origin)
    try {
        const parsed = JSON.parse(atob(stateRaw)) as { returnTo?: string }
        returnTo = safeReturnTo(c.env, parsed.returnTo, origin)
    } catch {
        /* use default */
    }

    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            code,
            client_id: c.env.GOOGLE_CLIENT_ID,
            client_secret: c.env.GOOGLE_CLIENT_SECRET,
            redirect_uri: c.env.GOOGLE_REDIRECT_URI,
            grant_type: "authorization_code",
        }),
    })

    if (!tokenResponse.ok) {
        const body = await tokenResponse.text()
        return c.html(`<html><body><p>Token exchange failed: ${body}</p></body></html>`, 500)
    }

    const tokenData = (await tokenResponse.json()) as { access_token: string }
    const userResponse = await fetch(GOOGLE_USERINFO_URL, {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })

    if (!userResponse.ok) {
        return c.html(`<html><body><p>Failed to load Google profile.</p></body></html>`, 500)
    }

    const profile = (await userResponse.json()) as { email?: string; email_verified?: boolean }
    const email = profile.email?.trim()

    if (!email || profile.email_verified === false) {
        return c.html(`<html><body><p>A verified Google email is required.</p></body></html>`, 403)
    }

    const customer = await ensureCustomerForEmail(c.env, email)
    const devBypass = isAuthDevAllowAny(c.env)

    const sub = customer.id
    const sessionToken = await createSessionToken(getSessionSecret(c.env), {
        sub,
        email,
        exp: sessionExpiryFromNow(),
    })

    c.header(
        "Set-Cookie",
        `${SESSION_COOKIE}=${encodeURIComponent(sessionToken)}; ${sessionCookieFlags(c.env, c.req.url)}`
    )

    if (!devBypass && !isCustomerEntitled(customer)) {
        return c.redirect(`${origin}/subscribe`)
    }

    return c.redirect(returnTo)
})

googleOAuth.post("/logout", async c => {
    c.header("Set-Cookie", `${SESSION_COOKIE}=; Path=/; HttpOnly; Max-Age=0`)
    return c.json({ ok: true })
})
