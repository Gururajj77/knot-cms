import type { Env } from "../env.js"
import { resolveDodoApiBaseUrl } from "./dodo-checkout.js"

export interface DodoSubscriptionSnapshot {
    quantity: number
    nextBillingDate: string | null
    scheduledChange: {
        quantity: number
        effectiveAt: string
        productId: string
    } | null
}

function readDodoApiError(body: unknown, response: Response, fallback: string): string {
    const row = body as { message?: string; error?: string }
    return row.message ?? row.error ?? `${fallback} (${response.status})`
}

async function fetchDodoSubscription(
    env: Env,
    subscriptionId: string
): Promise<DodoSubscriptionSnapshot> {
    const apiKey = env.DODO_API_KEY?.trim()
    if (!apiKey) {
        throw new Error("Dodo subscription API is not configured")
    }

    const id = subscriptionId.trim()
    if (!id) {
        throw new Error("Dodo subscription is not configured")
    }

    const response = await fetch(`${resolveDodoApiBaseUrl(env)}/subscriptions/${encodeURIComponent(id)}`, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: "application/json",
        },
    })

    const body = await response.json().catch(() => ({}))
    if (!response.ok) {
        throw new Error(readDodoApiError(body, response, "Dodo subscription lookup failed"))
    }

    const row = body as {
        quantity?: unknown
        next_billing_date?: unknown
        scheduled_change?: {
            quantity?: unknown
            effective_at?: unknown
            product_id?: unknown
        } | null
    }

    const scheduled = row.scheduled_change
    const scheduledChange =
        scheduled &&
        typeof scheduled.quantity === "number" &&
        typeof scheduled.effective_at === "string" &&
        typeof scheduled.product_id === "string"
            ? {
                  quantity: scheduled.quantity,
                  effectiveAt: scheduled.effective_at,
                  productId: scheduled.product_id,
              }
            : null

    return {
        quantity: typeof row.quantity === "number" ? row.quantity : 0,
        nextBillingDate:
            typeof row.next_billing_date === "string" ? row.next_billing_date : null,
        scheduledChange,
    }
}

/** Returns true when a scheduled change was cancelled. */
async function cancelDodoScheduledPlanChange(
    env: Env,
    subscriptionId: string
): Promise<boolean> {
    const apiKey = env.DODO_API_KEY?.trim()
    if (!apiKey) {
        throw new Error("Dodo subscription API is not configured")
    }

    const id = subscriptionId.trim()
    if (!id) {
        throw new Error("Dodo subscription is not configured")
    }

    const response = await fetch(
        `${resolveDodoApiBaseUrl(env)}/subscriptions/${encodeURIComponent(id)}/change-plan/scheduled`,
        {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                Accept: "application/json",
            },
        }
    )

    if (response.status === 404) return false

    const body = await response.json().catch(() => ({}))
    if (!response.ok) {
        throw new Error(readDodoApiError(body, response, "Dodo cancel scheduled change failed"))
    }

    return true
}

export async function cancelDodoSubscriptionImmediately(
    env: Env,
    subscriptionId: string
): Promise<void> {
    const apiKey = env.DODO_API_KEY?.trim()
    if (!apiKey) {
        throw new Error("Dodo subscription API is not configured")
    }

    const id = subscriptionId.trim()
    if (!id) {
        throw new Error("Dodo subscription is not configured")
    }

    const response = await fetch(`${resolveDodoApiBaseUrl(env)}/subscriptions/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "cancelled" }),
    })

    const body = (await response.json().catch(() => ({}))) as {
        message?: string
        error?: string
    }

    if (!response.ok) {
        const detail = body.message ?? body.error ?? `Dodo cancel subscription failed (${response.status})`
        throw new Error(detail)
    }
}
