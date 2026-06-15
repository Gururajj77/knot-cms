import { createDodoWebhookVerifier } from "../../src/billing/dodo-webhook.js"
import { TEST_WEBHOOK_SECRET } from "./test-secrets.js"

export const TEST_DODO_PRODUCT_ID = "prod_knotcms_test"

export function dodoSubscriptionData(
    overrides: Record<string, unknown> = {}
): Record<string, unknown> {
    return {
        payload_type: "Subscription",
        subscription_id: "sub_dodo_test",
        product_id: TEST_DODO_PRODUCT_ID,
        quantity: 1,
        status: "active",
        customer: {
            customer_id: "cus_dodo_test",
            email: "dodo-subscriber@example.com",
            name: "Dodo Subscriber",
        },
        next_billing_date: "2026-07-01T00:00:00.000Z",
        cancel_at_next_billing_date: false,
        ...overrides,
    }
}

export function dodoWebhookEvent(
    type: string,
    dataOverrides: Record<string, unknown> = {}
): { business_id: string; type: string; timestamp: string; data: Record<string, unknown> } {
    return {
        business_id: "biz_test",
        type,
        timestamp: "2026-06-01T12:00:00.000Z",
        data: dodoSubscriptionData(dataOverrides),
    }
}

export function signDodoWebhook(
    body: string,
    secret = TEST_WEBHOOK_SECRET,
    webhookId = "msg_dodo_test"
): Headers {
    const webhook = createDodoWebhookVerifier(secret)
    const timestamp = new Date()
    const signature = webhook.sign(webhookId, timestamp, body)

    return new Headers({
        "webhook-id": webhookId,
        "webhook-timestamp": Math.floor(timestamp.getTime() / 1000).toString(),
        "webhook-signature": signature,
    })
}
