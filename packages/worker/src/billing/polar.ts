import type { CustomerState } from "@polar-sh/sdk/models/components/customerstate.js"
import type { Subscription } from "@polar-sh/sdk/models/components/subscription.js"
import type { Env } from "../env.js"
import { upsertCustomer, updateCustomerByExternalCustomerId } from "../db/customers.js"

const ENTITLED_STATUSES = new Set(["active", "trialing"])

export function mapPolarSubscriptionStatus(status: string): string {
    return ENTITLED_STATUSES.has(status) ? "active" : "inactive"
}

function pickSubscriptionFromCustomerState(state: CustomerState): {
    subscriptionId: string | null
    subscriptionStatus: string
} {
    const active = state.activeSubscriptions.find(sub =>
        ENTITLED_STATUSES.has(String(sub.status))
    )
    if (active) {
        return { subscriptionId: active.id, subscriptionStatus: "active" }
    }

    const first = state.activeSubscriptions[0]
    return {
        subscriptionId: first?.id ?? null,
        subscriptionStatus: first ? mapPolarSubscriptionStatus(String(first.status)) : "inactive",
    }
}

async function upsertFromCustomerState(env: Env, state: CustomerState): Promise<void> {
    const email = state.email?.trim()
    if (!email) return

    const { subscriptionId, subscriptionStatus } = pickSubscriptionFromCustomerState(state)

    await upsertCustomer(env, {
        email,
        billingProvider: "polar",
        externalCustomerId: state.id,
        externalSubscriptionId: subscriptionId,
        subscriptionStatus,
    })
}

async function upsertFromSubscription(env: Env, subscription: Subscription): Promise<void> {
    const email = subscription.customer.email?.trim()
    const subscriptionStatus = mapPolarSubscriptionStatus(String(subscription.status))

    if (email) {
        await upsertCustomer(env, {
            email,
            billingProvider: "polar",
            externalCustomerId: subscription.customerId,
            externalSubscriptionId: subscription.id,
            subscriptionStatus,
        })
        return
    }

    await updateCustomerByExternalCustomerId(env, subscription.customerId, {
        externalSubscriptionId: subscription.id,
        subscriptionStatus,
    })
}

async function upsertFromCustomerRecord(
    env: Env,
    customer: { id: string; email?: string | null }
): Promise<void> {
    const email = customer.email?.trim()
    if (!email) return

    await upsertCustomer(env, {
        email,
        billingProvider: "polar",
        externalCustomerId: customer.id,
        externalSubscriptionId: null,
        subscriptionStatus: "inactive",
    })
}

export async function handlePolarBillingEvent(env: Env, event: { type: string; data: unknown }): Promise<void> {
    switch (event.type) {
        case "customer.state_changed":
            await upsertFromCustomerState(env, event.data as CustomerState)
            return

        case "customer.created":
        case "customer.updated":
            await upsertFromCustomerRecord(env, event.data as { id: string; email?: string | null })
            return

        case "subscription.created":
        case "subscription.updated":
        case "subscription.active":
        case "subscription.canceled":
        case "subscription.uncanceled":
        case "subscription.past_due":
        case "subscription.revoked":
            await upsertFromSubscription(env, event.data as Subscription)
            return

        default:
            return
    }
}
