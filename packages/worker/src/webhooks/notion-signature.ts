const NOTION_SIG_PREFIX = "sha256="

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
    const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    )
    const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message))
    return Array.from(new Uint8Array(sig))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("")
}

function timingSafeEqualStrings(a: string, b: string): boolean {
    if (a.length !== b.length) return false
    let diff = 0
    for (let i = 0; i < a.length; i++) {
        diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
    }
    return diff === 0
}

/** Verify Notion `X-Notion-Signature` over the raw POST body. */
export async function verifyNotionWebhookSignature(
    verificationToken: string,
    rawBody: string,
    signatureHeader: string | undefined
): Promise<boolean> {
    if (!signatureHeader?.startsWith(NOTION_SIG_PREFIX)) return false

    const received = signatureHeader.slice(NOTION_SIG_PREFIX.length)
    const expected = await hmacSha256Hex(verificationToken, rawBody)
    return timingSafeEqualStrings(received, expected)
}
