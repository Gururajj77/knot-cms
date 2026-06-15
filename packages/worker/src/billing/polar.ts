import type { CustomerState } from "@polar-sh/sdk/models/components/customerstate.js"
import type { Subscription } from "@polar-sh/sdk/models/components/subscription.js"
import type { PlanId } from "@knotcms/shared"
import { planIdForPolarProduct } from "@knotcms/shared"
import type { Env } from "../env.js"
import {
    getCustomerByEmail,
    setCustomerBillingState,
    upsertCustomer,
    updateCustomerByExternalCustomerId,
} from "../db/customers.js"
import { resolveSubscriptionProjectLimit } from "./subscription-limit.js"

export { resolveSubscriptionProjectLimit } from "./subscription-limit.js"

const ENTITLED_STATUSES = new Set(["active", "trialing"])

export function mapPolarSubscriptionStatus(status: string): string {
    return ENTITLED_STATUSES.has(status) ? "active" : "inactive"
}

function toIsoTimestamp(value: unknown): string | null {
    if (!value) return null
    if (typeof value === "string") return value
    if (value instanceof Date) return value.toISOString()
    return null
}

export function parsePolarSubscriptionSchedule(data: unknown): {
    cancelAtPeriodEnd: boolean
    subscriptionEndsAt: string | null
} {
    if (!data || typeof data !== "object") {
        return { cancelAtPeriodEnd: false, subscriptionEndsAt: null }
    }

    const row = data as Record<string, unknown>
    const cancelAtPeriodEnd = Boolean(row.cancelAtPeriodEnd ?? row.cancel_at_period_end)
    const endRaw = row.currentPeriodEnd ?? row.current_period_end ?? row.endsAt ?? row.ends_at
    const subscriptionEndsAt = cancelAtPeriodEnd ? toIsoTimestamp(endRaw) : null
    return { cancelAtPeriodEnd, subscriptionEndsAt }
}

export function parsePolarSubscriptionSeats(data: unknown): number | null {
    if (!data || typeof data !== "object") return null
    const row = data as Record<string, unknown>

    const direct = row.seats
    if (typeof direct === "number" && Number.isFinite(direct) && direct >= 1) {
        return Math.floor(direct)
    }

    const metadata = row.metadata
    if (metadata && typeof metadata === "object") {
        const meta = metadata as Record<string, unknown>
        const newSeats = meta.newSeats ?? meta.new_seats
        if (typeof newSeats === "number" && Number.isFinite(newSeats) && newSeats >= 1) {
            return Math.floor(newSeats)
        }
    }

    return null
}

function resolveEntitlementFromPolar(
    status: string,
    schedule: { cancelAtPeriodEnd: boolean; subscriptionEndsAt: string | null }
): { subscriptionStatus: string; entitled: boolean } {
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

async function applySubscriptionSchedule(
    env: Env,
    email: string,
    entitled: boolean,
    schedule: { cancelAtPeriodEnd: boolean; subscriptionEndsAt: string | null }
): Promise<void> {
    if (!entitled) {
        await setCustomerBillingState(env, email, {
            cancelAtPeriodEnd: false,
            subscriptionEndsAt: null,
        })
        return
    }

    await setCustomerBillingState(env, email, schedule)
}

function isPaidPolarProduct(env: Env, productId: string | null | undefined): boolean {
    const id = productId?.trim()
    if (!id) return false
    if (planIdForPolarProduct(id) === "paid") return true
    if (env.POLAR_PROJECT_PRODUCT_ID?.trim() === id) return true
    if (env.POLAR_PRO_PRODUCT_ID?.trim() === id) return true
    if (env.POLAR_MAX_PRODUCT_ID?.trim() === id) return true
    return false
}

function planIdFromSubscription(
    env: Env,
    subscription: Subscription | Record<string, unknown>,
    entitled: boolean
): PlanId | undefined {
    const productId =
        "productId" in subscription
            ? subscription.productId
            : (subscription as Record<string, unknown>).product_id
    if (isPaidPolarProduct(env, typeof productId === "string" ? productId : null)) {
        return "paid"
    }
    const fromMap = planIdForPolarProduct(typeof productId === "string" ? productId : null)
    if (fromMap) return fromMap
    return entitled ? "paid" : undefined
}

function pickSubscriptionFromCustomerState(state: CustomerState): {
    subscription: (typeof state.activeSubscriptions)[number] | null
    subscriptionId: string | null
    subscriptionStatus: string
} {
    const entitled = state.activeSubscriptions.filter(sub =>
        ENTITLED_STATUSES.has(String(sub.status))
    )
    const pool = entitled.length > 0 ? entitled : state.activeSubscriptions
    const subscription =
        pool.reduce<(typeof state.activeSubscriptions)[number] | null>((best, sub) => {
            const seats = parsePolarSubscriptionSeats(sub) ?? 0
            const bestSeats = best ? (parsePolarSubscriptionSeats(best) ?? 0) : 0
            return seats > bestSeats ? sub : best
        }, null) ?? pool[0] ?? null

    if (!subscription) {
        return { subscription: null, subscriptionId: null, subscriptionStatus: "inactive" }
    }

    return {
        subscription,
        subscriptionId: subscription.id,
        subscriptionStatus: ENTITLED_STATUSES.has(String(subscription.status))
            ? "active"
            : mapPolarSubscriptionStatus(String(subscription.status)),
    }
}

function pickScheduleFromCustomerState(state: CustomerState): {
    cancelAtPeriodEnd: boolean
    subscriptionEndsAt: string | null
} {
    const { subscription } = pickSubscriptionFromCustomerState(state)
    if (!subscription) {
        return { cancelAtPeriodEnd: false, subscriptionEndsAt: null }
    }
    return parsePolarSubscriptionSchedule(subscription)
}

async function applySubscriptionBilling(
    env: Env,
    email: string,
    subscription: Subscription | Record<string, unknown>,
    entitled: boolean
): Promise<void> {
    const existing = await getCustomerByEmail(env, email)
    const planId = planIdFromSubscription(env, subscription, entitled)
    const seats = parsePolarSubscriptionSeats(subscription)
    const schedule = parsePolarSubscriptionSchedule(subscription)
    const subscriptionProjectLimit = resolveSubscriptionProjectLimit(
        seats,
        entitled,
        existing?.subscription_project_limit
    )

    if (planId) {
        await setCustomerBillingState(env, email, {
            planId,
            subscriptionProjectLimit,
            cancelAtPeriodEnd: schedule.cancelAtPeriodEnd,
            subscriptionEndsAt: schedule.subscriptionEndsAt,
        })
    } else if (subscriptionProjectLimit !== undefined) {
        await setCustomerBillingState(env, email, {
            subscriptionProjectLimit,
            cancelAtPeriodEnd: schedule.cancelAtPeriodEnd,
            subscriptionEndsAt: schedule.subscriptionEndsAt,
        })
    } else {
        await applySubscriptionSchedule(env, email, entitled, schedule)
    }
}

async function upsertFromCustomerState(env: Env, state: CustomerState): Promise<void> {
    const email = state.email?.trim()
    if (!email) return

    const existing = await getCustomerByEmail(env, email)
    const { subscription, subscriptionId, subscriptionStatus } = pickSubscriptionFromCustomerState(state)
    const schedule = pickScheduleFromCustomerState(state)
    const { subscriptionStatus: resolvedStatus, entitled } = resolveEntitlementFromPolar(
        subscriptionStatus,
        schedule
    )
    const planId = subscription
        ? planIdFromSubscription(env, subscription, entitled)
        : entitled
          ? "paid"
          : undefined
    const subscriptionProjectLimit = resolveSubscriptionProjectLimit(
        parsePolarSubscriptionSeats(subscription),
        entitled,
        existing?.subscription_project_limit
    )

    await upsertCustomer(env, {
        email,
        billingProvider: "polar",
        externalCustomerId: state.id,
        externalSubscriptionId: subscriptionId,
        subscriptionStatus: resolvedStatus,
        planId,
        subscriptionProjectLimit,
    })

    if (subscription && entitled) {
        await applySubscriptionBilling(env, email, subscription, entitled)
    } else {
        await applySubscriptionSchedule(env, email, entitled, schedule)
    }
}

async function upsertFromSubscription(env: Env, subscription: Subscription): Promise<void> {
    const email = subscription.customer.email?.trim()
    const schedule = parsePolarSubscriptionSchedule(subscription)
    const { subscriptionStatus, entitled } = resolveEntitlementFromPolar(
        String(subscription.status),
        schedule
    )
    const planId = planIdFromSubscription(env, subscription, entitled)
    const existing = email ? await getCustomerByEmail(env, email) : null
    const subscriptionProjectLimit = resolveSubscriptionProjectLimit(
        parsePolarSubscriptionSeats(subscription),
        entitled,
        existing?.subscription_project_limit
    )

    if (email) {
        await upsertCustomer(env, {
            email,
            billingProvider: "polar",
            externalCustomerId: subscription.customerId,
            externalSubscriptionId: subscription.id,
            subscriptionStatus,
            planId,
            subscriptionProjectLimit,
        })
        await applySubscriptionBilling(env, email, subscription, entitled)
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
        case "subscription.seats_updated":
            await upsertFromSubscription(env, event.data as Subscription)
            return

        default:
            return
    }
}
