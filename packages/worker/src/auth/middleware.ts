import {
    createSessionToken,
    sessionExpiryFromNow,
    verifySessionToken,
    type SessionPayload,
} from "@notion-framer/shared"
import type { Context, Next } from "hono"
import type { Env } from "../env.js"

export const SESSION_COOKIE = "pf_session"

export function getSessionSecret(env: Env): string {
    return env.SESSION_SIGNING_SECRET?.trim() || env.LICENSE_SIGNING_SECRET
}

export function sessionCookieFlags(env: Env, requestUrl?: string): string {
    let secure = false
    if (requestUrl) {
        try {
            secure = new URL(requestUrl).protocol === "https:"
        } catch {
            secure = false
        }
    } else {
        secure =
            !env.WORKER_PUBLIC_URL.includes("localhost") &&
            !env.WORKER_PUBLIC_URL.startsWith("http://")
    }
    return `HttpOnly; Path=/; SameSite=Lax; Max-Age=${30 * 24 * 60 * 60}${secure ? "; Secure" : ""}`
}

export async function readSession(env: Env, cookieHeader: string | undefined): Promise<SessionPayload | null> {
    if (!cookieHeader) return null

    const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`))
    const raw = match?.[1]
    if (!raw) return null

    const result = await verifySessionToken(getSessionSecret(env), decodeURIComponent(raw))
    return result.valid ? result.payload : null
}

export async function issueSessionCookie(env: Env, payload: Omit<SessionPayload, "exp">): Promise<string> {
    return createSessionToken(getSessionSecret(env), {
        ...payload,
        exp: sessionExpiryFromNow(),
    })
}

export async function requireSession(c: Context<{ Bindings: Env }>, next: Next) {
    const session = await readSession(c.env, c.req.header("Cookie"))
    if (!session) {
        return c.json({ error: "Unauthorized" }, 401)
    }

    c.set("session", session)
    await next()
}

declare module "hono" {
    interface ContextVariableMap {
        session: SessionPayload
    }
}
