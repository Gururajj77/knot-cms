/**
 * Stateless license keys: base64url(payload).base64url(hmac)
 * payload: { projectUrl, exp? }
 */

export interface LicensePayload {
    projectUrl: string
    exp?: number
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

export async function createLicenseKey(
    signingSecret: string,
    payload: LicensePayload
): Promise<string> {
    const payloadJson = JSON.stringify(payload)
    const payloadB64 = base64UrlEncode(new TextEncoder().encode(payloadJson))
    const sig = await hmacSign(signingSecret, payloadB64)
    return `${payloadB64}.${sig}`
}

export async function verifyLicenseKey(
    signingSecret: string,
    licenseKey: string,
    expectedProjectUrl: string
): Promise<{ valid: boolean; reason?: string }> {
    const parts = licenseKey.split(".")
    if (parts.length !== 2) {
        return { valid: false, reason: "Invalid license format" }
    }

    const [payloadB64, sig] = parts as [string, string]
    const expectedSig = await hmacSign(signingSecret, payloadB64)
    if (sig !== expectedSig) {
        return { valid: false, reason: "Invalid license signature" }
    }

    let payload: LicensePayload
    try {
        const decoded = new TextDecoder().decode(base64UrlDecode(payloadB64))
        payload = JSON.parse(decoded) as LicensePayload
    } catch {
        return { valid: false, reason: "Invalid license payload" }
    }

    if (payload.projectUrl !== expectedProjectUrl) {
        return { valid: false, reason: "License not valid for this project" }
    }

    if (payload.exp && Date.now() > payload.exp) {
        return { valid: false, reason: "License expired" }
    }

    return { valid: true }
}
