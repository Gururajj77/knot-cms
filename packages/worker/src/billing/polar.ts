import type { CustomerState } from "@polar-sh/sdk/models/components/customerstate.js"
import type { Subscription } from "@polar-sh/sdk/models/components/subscription.js"
import type { PlanId } from "@nocms/shared"
import { planIdForPolarProduct } from "@nocms/shared"
import type { Env } from "../env.js"
import {
    getCustomerByEmail,
    setCustomerPlanId,
    upsertCustomer,
    updateCustomerByExternalCustomerId,
} from "../db/customers.js"

const ENTITLED_STATUSES = new Set(["active", "trialing"])

export function mapPolarSubscriptionStatus(status: string): string {
    return ENTITLED_STATUSES.has(status) ? "active" : "inactive"
}

function resolvePlanFromProduct(env: Env, productId: string | null | undefined): PlanId | null {
    const fromMap = planIdForPolarProduct(productId)
    if (fromMap) return fromMap

    const id = productId?.trim()
    if (!id) return null
    if (env.POLAR_PRO_PRODUCT_ID?.trim() === id) return "pro"
    if (env.POLAR_MAX_PRODUCT_ID?.trim() === id) return "max"
    return null
}

function planIdFromSubscription(env: Env, subscription: Subscription, entitled: boolean): PlanId | undefined {
    const fromProduct = resolvePlanFromProduct(env, subscription.productId)
    if (fromProduct) return fromProduct
    return entitled ? "pro" : undefined
}

function planIdFromCustomerState(env: Env, state: CustomerState, entitled: boolean): PlanId | undefined {
    let resolved: PlanId | null = null
    for (const sub of state.activeSubscriptions) {
        const plan = resolvePlanFromProduct(env, sub.productId)
        if (plan === "max") return "max"
        if (plan === "pro") resolved = "pro"
    }
    if (resolved) return resolved
    return entitled ? "pro" : undefined
}

async function applyPlanId(env: Env, email: string, planId: PlanId | undefined): Promise<void> {
    if (!planId) return
    const customer = await getCustomerByEmail(env, email)
    if (customer) await setCustomerPlanId(env, customer.id, planId)
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
    const entitled = subscriptionStatus === "active"
    const planId = planIdFromCustomerState(env, state, entitled)

    await upsertCustomer(env, {
        email,
        billingProvider: "polar",
        externalCustomerId: state.id,
        externalSubscriptionId: subscriptionId,
        subscriptionStatus,
        planId,
    })
    await applyPlanId(env, email, planId)
}

async function upsertFromSubscription(env: Env, subscription: Subscription): Promise<void> {
    const email = subscription.customer.email?.trim()
    const subscriptionStatus = mapPolarSubscriptionStatus(String(subscription.status))
    const entitled = subscriptionStatus === "active"
    const planId = planIdFromSubscription(env, subscription, entitled)

    if (email) {
        await upsertCustomer(env, {
            email,
            billingProvider: "polar",
            externalCustomerId: subscription.customerId,
            externalSubscriptionId: subscription.id,
            subscriptionStatus,
            planId,
        })
        await applyPlanId(env, email, planId)
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
