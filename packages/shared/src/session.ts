/**
 * Stateless session tokens: base64url(payload).base64url(hmac)
 */

export interface SessionPayload {
    sub: string
    email: string
    exp: number
}

function base64UrlEncode(data: Uint8Array): string {
    let binary = ""
    for (const byte of data) binary += String.fromCharCode(byte)
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function base64UrlDecode(str: string): Uint8Array {
    const padded = str.replace(/-/g, "+").replace(/_/g, "/")
    const binary = atob(padded)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return bytes
}

async function hmacSign(secret: string, message: string): Promise<string> {
    const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    )
    const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message))
    return base64UrlEncode(new Uint8Array(sig))
}

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000

export function sessionExpiryFromNow(now = Date.now()): number {
    return now + SESSION_TTL_MS
}

export async function createSessionToken(
    signingSecret: string,
    payload: SessionPayload
): Promise<string> {
    const payloadB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)))
    const sig = await hmacSign(signingSecret, payloadB64)
    return `${payloadB64}.${sig}`
}

export async function verifySessionToken(
    signingSecret: string,
    token: string
): Promise<{ valid: true; payload: SessionPayload } | { valid: false; reason: string }> {
    const parts = token.split(".")
    if (parts.length !== 2) {
        return { valid: false, reason: "Invalid session format" }
    }

    const [payloadB64, sig] = parts as [string, string]
    if ((await hmacSign(signingSecret, payloadB64)) !== sig) {
        return { valid: false, reason: "Invalid session signature" }
    }

    let payload: SessionPayload
    try {
        payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(payloadB64))) as SessionPayload
    } catch {
        return { valid: false, reason: "Invalid session payload" }
    }

    if (!payload.sub || !payload.email || !payload.exp) {
        return { valid: false, reason: "Incomplete session payload" }
    }

    if (Date.now() > payload.exp) {
        return { valid: false, reason: "Session expired" }
    }

    return { valid: true, payload }
}
