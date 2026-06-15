import type { Env } from "../env.js"
import { getBillingAdapter, getBillingWebhookConfigError } from "../billing/adapter.js"
import { WebhookVerificationError as DodoWebhookVerificationError } from "../billing/dodo-webhook.js"
import { WebhookVerificationError as PolarWebhookVerificationError } from "../billing/polar-adapter.js"

export async function handleBillingWebhook(
    env: Env,
    rawBody: string,
    headers: Headers
): Promise<Response> {
    const configError = getBillingWebhookConfigError(env)
    if (configError) {
        return new Response(configError, { status: 503 })
    }

    try {
        const adapter = getBillingAdapter(env)
        const event = await adapter.verifyWebhook(rawBody, headers, env)
        await adapter.handleWebhookEvent(env, event)
        return new Response(null, { status: 202 })
    } catch (error) {
        if (
            error instanceof PolarWebhookVerificationError ||
            error instanceof DodoWebhookVerificationError
        ) {
            return new Response("Invalid signature", { status: 403 })
        }
        console.error("billing webhook error", error)
        return new Response("Webhook handler failed", { status: 500 })
    }
}
