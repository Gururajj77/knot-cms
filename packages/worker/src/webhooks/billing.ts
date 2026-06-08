import { validateEvent, WebhookVerificationError } from "@polar-sh/sdk/webhooks"
import type { Env } from "../env.js"
import { handlePolarBillingEvent } from "../billing/polar.js"

function webhookHeaderRecord(headers: Headers): Record<string, string> {
    const record: Record<string, string> = {}
    headers.forEach((value, key) => {
        record[key] = value
    })
    return record
}

export async function handleBillingWebhook(
    env: Env,
    rawBody: string,
    headers: Headers
): Promise<Response> {
    if (env.BILLING_PROVIDER !== "polar") {
        return new Response("Billing provider not configured", { status: 503 })
    }

    const secret = env.BILLING_WEBHOOK_SECRET
    if (!secret) {
        return new Response("Billing webhook secret not configured", { status: 503 })
    }

    try {
        const event = validateEvent(rawBody, webhookHeaderRecord(headers), secret)
        await handlePolarBillingEvent(env, event)
        return new Response(null, { status: 202 })
    } catch (error) {
        if (error instanceof WebhookVerificationError) {
            return new Response("Invalid signature", { status: 403 })
        }
        console.error("billing webhook error", error)
        return new Response("Webhook handler failed", { status: 500 })
    }
}
