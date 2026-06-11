import { Webhook } from "standardwebhooks"
import { TEST_WEBHOOK_SECRET } from "./test-secrets.js"

export { TEST_WEBHOOK_SECRET }

function utf8ToBase64(value: string): string {
    const bytes = new TextEncoder().encode(value)
    let binary = ""
    for (const byte of bytes) binary += String.fromCharCode(byte)
    return btoa(binary)
}

export function signPolarWebhook(
    body: string,
    secret = TEST_WEBHOOK_SECRET,
    webhookId = "msg_test"
): Headers {
    const webhook = new Webhook(utf8ToBase64(secret))
    const timestamp = new Date()
    const signature = webhook.sign(webhookId, timestamp, body)

    return new Headers({
        "webhook-id": webhookId,
        "webhook-timestamp": Math.floor(timestamp.getTime() / 1000).toString(),
        "webhook-signature": signature,
    })
}
