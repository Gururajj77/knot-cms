import { validateEvent, WebhookVerificationError } from "@polar-sh/sdk/webhooks"
import type { BillingAdapter, BillingWebhookEvent } from "./adapter.js"
import type { Env } from "../env.js"
import { handlePolarBillingEvent } from "./polar.js"

function webhookHeaderRecord(headers: Headers): Record<string, string> {
    const record: Record<string, string> = {}
    headers.forEach((value, key) => {
        record[key] = value
    })
    return record
}

export const polarBillingAdapter: BillingAdapter = {
    provider: "polar",

    async verifyWebhook(rawBody: string, headers: Headers, env: Env): Promise<BillingWebhookEvent> {
        const secret = env.BILLING_WEBHOOK_SECRET
        if (!secret) {
            throw new WebhookVerificationError("Billing webhook secret not configured")
        }
        const event = validateEvent(rawBody, webhookHeaderRecord(headers), secret)
        return { type: event.type, data: event.data }
    },

    async handleWebhookEvent(env: Env, event: BillingWebhookEvent): Promise<void> {
        await handlePolarBillingEvent(env, event)
    },
}

export { WebhookVerificationError }
