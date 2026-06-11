import { createSessionToken, sessionExpiryFromNow } from "@nocms/shared"
import { SESSION_COOKIE } from "../../src/auth/middleware.js"
import type { Env } from "../../src/env.js"

function sessionSecret(env: Env): string {
    return env.SESSION_SIGNING_SECRET?.trim() || env.LICENSE_SIGNING_SECRET
}

export async function sessionCookieHeader(
    env: Env,
    email: string,
    sub: string
): Promise<string> {
    const token = await createSessionToken(sessionSecret(env), {
        sub,
        email,
        exp: sessionExpiryFromNow(),
    })
    return `${SESSION_COOKIE}=${encodeURIComponent(token)}`
}
