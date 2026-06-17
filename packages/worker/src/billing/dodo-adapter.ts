import type { BillingAdapter, BillingWebhookEvent } from "./adapter.js"
import type { Env } from "../env.js"
import { handleDodoBillingEvent } from "./dodo.js"
import { verifyDodoWebhook, WebhookVerificationError } from "./dodo-webhook.js"

export const dodoBillingAdapter: BillingAdapter = {
    provider: "dodo",

    async verifyWebhook(rawBody: string, headers: Headers, env: Env): Promise<BillingWebhookEvent> {
        const secret = env.DODO_WEBHOOK_SECRET
        if (!secret) {
            throw new WebhookVerificationError("Dodo webhook secret not configured")
        }
        const event = verifyDodoWebhook(rawBody, headers, secret)
        return { type: event.type, data: event.data }
    },

    async handleWebhookEvent(env: Env, event: BillingWebhookEvent): Promise<void> {
        await handleDodoBillingEvent(env, event)
    },
}

