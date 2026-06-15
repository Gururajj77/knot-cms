import { Webhook, WebhookVerificationError } from "standardwebhooks"

export { WebhookVerificationError }

function utf8ToBase64(value: string): string {
    const bytes = new TextEncoder().encode(value)
    let binary = ""
    for (const byte of bytes) binary += String.fromCharCode(byte)
    return btoa(binary)
}

/** Dodo dashboard secrets use `whsec_…`; local test secrets are raw strings. */
export function createDodoWebhookVerifier(secret: string): Webhook {
    const trimmed = secret.trim()
    if (trimmed.startsWith("whsec_")) {
        return new Webhook(trimmed)
    }
    return new Webhook(utf8ToBase64(trimmed))
}

export function verifyDodoWebhook(
    rawBody: string,
    headers: Headers,
    secret: string
): { type: string; data: unknown; business_id?: string; timestamp?: string } {
    const record: Record<string, string> = {}
    headers.forEach((value, key) => {
        record[key] = value
    })

    const verifier = createDodoWebhookVerifier(secret)
    return verifier.verify(rawBody, record) as {
        type: string
        data: unknown
        business_id?: string
        timestamp?: string
    }
}
