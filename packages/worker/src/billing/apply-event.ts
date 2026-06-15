import type { NormalizedSubscriptionEvent } from "@knotcms/shared"
import type { Env } from "../env.js"
import {
    getCustomerByEmail,
    setCustomerBillingState,
    upsertCustomer,
    updateCustomerByExternalCustomerId,
} from "../db/customers.js"
import { resolveSubscriptionProjectLimit } from "./subscription-limit.js"

export async function applyNormalizedSubscriptionEvent(
    env: Env,
    event: NormalizedSubscriptionEvent
): Promise<void> {
    const email = event.email.trim()
    if (!email) return

    const entitled = event.subscriptionStatus === "active"
    const existing = await getCustomerByEmail(env, email)
    const subscriptionProjectLimit = resolveSubscriptionProjectLimit(
        event.quantity,
        entitled,
        existing?.subscription_project_limit
    )

    if (event.externalCustomerId) {
        await upsertCustomer(env, {
            email,
            billingProvider: event.billingProvider,
            externalCustomerId: event.externalCustomerId,
            externalSubscriptionId: event.externalSubscriptionId,
            subscriptionStatus: event.subscriptionStatus,
            planId: event.planId,
            subscriptionProjectLimit,
        })
    } else if (event.externalSubscriptionId) {
        const externalCustomerId = existing?.external_customer_id
        if (!externalCustomerId) return
        await updateCustomerByExternalCustomerId(env, externalCustomerId, {
            externalSubscriptionId: event.externalSubscriptionId,
            subscriptionStatus: event.subscriptionStatus,
        })
        return
    } else {
        return
    }

    if (event.planId || subscriptionProjectLimit !== undefined) {
        await setCustomerBillingState(env, email, {
            planId: event.planId,
            subscriptionProjectLimit,
            cancelAtPeriodEnd: event.cancelAtPeriodEnd,
            subscriptionEndsAt: event.subscriptionEndsAt,
            subscriptionRenewsAt: event.subscriptionRenewsAt,
            seatsAddLockedUntil: event.resetSeatsAddLock ? null : undefined,
            ...(entitled
                ? {
                      pendingCheckoutQuantity: null,
                      pendingPlanQuantity: null,
                      pendingPlanReminderAt: null,
                  }
                : {}),
        })
        return
    }

    if (!entitled) {
        await setCustomerBillingState(env, email, {
            cancelAtPeriodEnd: false,
            subscriptionEndsAt: null,
            seatsAddLockedUntil: null,
        })
        return
    }

    await setCustomerBillingState(env, email, {
        cancelAtPeriodEnd: event.cancelAtPeriodEnd,
        subscriptionEndsAt: event.subscriptionEndsAt,
        subscriptionRenewsAt: event.subscriptionRenewsAt,
        seatsAddLockedUntil: event.resetSeatsAddLock ? null : undefined,
    })
}

export async function applyNormalizedSubscriptionEvents(
    env: Env,
    events: NormalizedSubscriptionEvent[]
): Promise<void> {
    for (const event of events) {
        await applyNormalizedSubscriptionEvent(env, event)
    }
}
