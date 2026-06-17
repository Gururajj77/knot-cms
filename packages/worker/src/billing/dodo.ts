import { planIdForDodoProduct } from "@knotcms/shared"
import type { CustomerSubscriptionStatus, NormalizedSubscriptionEvent } from "@knotcms/shared"
import type { Env } from "../env.js"
import { applyNormalizedSubscriptionEvent } from "./apply-event.js"

const FORCE_INACTIVE_EVENTS = new Set([
    "subscription.expired",
    "subscription.on_hold",
    "subscription.failed",
])

const HANDLED_EVENTS = new Set([
    "subscription.active",
    "subscription.updated",
    "subscription.plan_changed",
    "subscription.renewed",
    "subscription.cancelled",
    ...FORCE_INACTIVE_EVENTS,
])

function toIsoTimestamp(value: unknown): string | null {
    if (!value) return null
    if (typeof value === "string") return value
    if (value instanceof Date) return value.toISOString()
    return null
}

function isKnotcmsDodoProduct(env: Env, productId: string | null | undefined): boolean {
    return planIdForDodoProduct(productId, env.DODO_PROJECT_PRODUCT_ID) === "paid"
}

export function parseDodoSubscriptionQuantity(data: unknown): number | null {
    if (!data || typeof data !== "object") return null
    const row = data as Record<string, unknown>

    const quantity = row.quantity
    if (typeof quantity === "number" && Number.isFinite(quantity) && quantity >= 1) {
        return Math.floor(quantity)
    }

    return null
}

function parseDodoSubscriptionRenewsAt(data: unknown): string | null {
    if (!data || typeof data !== "object") return null
    const row = data as Record<string, unknown>
    return toIsoTimestamp(row.next_billing_date)
}

export function parseDodoSubscriptionSchedule(data: unknown): {
    cancelAtPeriodEnd: boolean
    subscriptionEndsAt: string | null
} {
    if (!data || typeof data !== "object") {
        return { cancelAtPeriodEnd: false, subscriptionEndsAt: null }
    }

    const row = data as Record<string, unknown>
    const cancelAtPeriodEnd = Boolean(row.cancel_at_next_billing_date)
    const endRaw = cancelAtPeriodEnd ? (row.next_billing_date ?? row.cancelled_at) : null
    const subscriptionEndsAt = cancelAtPeriodEnd ? toIsoTimestamp(endRaw) : null
    return { cancelAtPeriodEnd, subscriptionEndsAt }
}

const ENTITLED_STATUSES = new Set(["active", "trialing"])

export function resolveDodoSubscriptionEntitlement(
    eventType: string,
    status: string,
    schedule: { cancelAtPeriodEnd: boolean; subscriptionEndsAt: string | null }
): { subscriptionStatus: CustomerSubscriptionStatus; entitled: boolean } {
    if (FORCE_INACTIVE_EVENTS.has(eventType)) {
        return { subscriptionStatus: "inactive", entitled: false }
    }

    if (ENTITLED_STATUSES.has(status)) {
        return { subscriptionStatus: "active", entitled: true }
    }

    if (
        schedule.cancelAtPeriodEnd &&
        schedule.subscriptionEndsAt &&
        new Date(schedule.subscriptionEndsAt).getTime() > Date.now()
    ) {
        return { subscriptionStatus: "active", entitled: true }
    }

    return { subscriptionStatus: "inactive", entitled: false }
}

export function dodoSubscriptionToNormalizedEvent(
    env: Env,
    eventType: string,
    data: unknown
): NormalizedSubscriptionEvent | null {
    if (!HANDLED_EVENTS.has(eventType)) return null
    if (!data || typeof data !== "object") return null

    const row = data as Record<string, unknown>
    const productId = typeof row.product_id === "string" ? row.product_id : null
    if (!isKnotcmsDodoProduct(env, productId)) return null

    const customer = row.customer
    if (!customer || typeof customer !== "object") return null
    const customerRow = customer as Record<string, unknown>

    const email = typeof customerRow.email === "string" ? customerRow.email.trim() : ""
    if (!email) return null

    const externalCustomerId =
        typeof customerRow.customer_id === "string" ? customerRow.customer_id : null
    const externalSubscriptionId =
        typeof row.subscription_id === "string" ? row.subscription_id : null
    const status = typeof row.status === "string" ? row.status : "inactive"
    const schedule = parseDodoSubscriptionSchedule(row)
    const { subscriptionStatus, entitled } = resolveDodoSubscriptionEntitlement(
        eventType,
        status,
        schedule
    )

    return {
        email,
        billingProvider: "dodo",
        externalCustomerId,
        externalSubscriptionId,
        subscriptionStatus,
        planId: entitled ? "paid" : undefined,
        quantity: parseDodoSubscriptionQuantity(row),
        cancelAtPeriodEnd: schedule.cancelAtPeriodEnd,
        subscriptionEndsAt: schedule.subscriptionEndsAt,
        subscriptionRenewsAt: parseDodoSubscriptionRenewsAt(row),
        resetSeatsAddLock: eventType === "subscription.renewed",
    }
}

export async function handleDodoBillingEvent(
    env: Env,
    event: { type: string; data: unknown }
): Promise<void> {
    const normalized = dodoSubscriptionToNormalizedEvent(env, event.type, event.data)
    if (!normalized) return
    await applyNormalizedSubscriptionEvent(env, normalized)
}
