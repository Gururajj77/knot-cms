import type { CustomerRow } from "../db/customers.js"
import { countProjectsForCustomer, setCustomerBillingState } from "../db/customers.js"
import type { Env } from "../env.js"
import { hasActivePaidSubscription } from "./entitlements.js"
import { resolveBillingProvider } from "./billing-config.js"
import { createBillingCheckout, parseCheckoutQuantity, canUseDodoCheckoutApi } from "./billing-checkout-api.js"
import { cancelDodoSubscriptionImmediately } from "./dodo-subscription.js"
import {
    clearPendingPlanIntent,
    setDeferredPlanChange,
    setPendingCheckoutQuantity,
} from "./billing-pending-plan.js"

export type RestartBillingTiming = "now" | "before_renewal"

export interface RestartBillingWithSeatsInput {
    customer: CustomerRow
    email: string
    quantity: number
    returnUrl: string
    timing?: RestartBillingTiming
}

export async function restartBillingWithSeats(
    env: Env,
    input: RestartBillingWithSeatsInput
): Promise<{ url?: string; sessionId?: string | null; reminderAt?: string; deferred?: boolean }> {
    const provider = resolveBillingProvider(env)
    if (provider !== "dodo") {
        throw new Error("Plan restart is only available with Dodo billing")
    }
    if (!hasActivePaidSubscription(input.customer)) {
        throw new Error("An active subscription is required to change your plan")
    }

    const quantity = parseCheckoutQuantity(input.quantity)
    if (quantity === null) {
        throw new Error("quantity must be an integer between 1 and 100")
    }

    const projectsInUse = await countProjectsForCustomer(env, input.customer.id)
    if (quantity < projectsInUse) {
        throw new Error(
            `Seat count cannot be lower than projects in use (${projectsInUse}). Delete extra projects first.`
        )
    }

    const timing = input.timing ?? "now"
    if (timing === "before_renewal") {
        const { reminderAt } = await setDeferredPlanChange(
            env,
            input.email,
            quantity,
            input.customer.subscription_renews_at
        )
        return { deferred: true, reminderAt }
    }

    const subscriptionId = input.customer.external_subscription_id?.trim()
    if (!subscriptionId) {
        throw new Error(
            "No subscription linked yet. Complete checkout first, then click Refresh status."
        )
    }

    await cancelDodoSubscriptionImmediately(env, subscriptionId)

    await setCustomerBillingState(env, input.email, {
        subscriptionStatus: "inactive",
        cancelAtPeriodEnd: false,
        subscriptionEndsAt: null,
        seatsAddLockedUntil: null,
        pendingCheckoutQuantity: quantity,
        pendingPlanQuantity: null,
        pendingPlanReminderAt: null,
    })

    const checkout = await createBillingCheckout(env, {
        email: input.email,
        customerId: input.customer.id,
        quantity,
        returnUrl: input.returnUrl,
    })

    return checkout
}

export interface CompletePendingCheckoutInput {
    customer: CustomerRow
    email: string
    quantity: number
    returnUrl: string
}

export async function completePendingCheckout(
    env: Env,
    input: CompletePendingCheckoutInput
): Promise<{ url: string; sessionId?: string | null }> {
    const provider = resolveBillingProvider(env)
    if (provider !== "dodo") {
        throw new Error("Checkout is only available with Dodo billing")
    }
    if (!canUseDodoCheckoutApi(env)) {
        throw new Error("Dodo checkout API is not configured")
    }

    const quantity = parseCheckoutQuantity(input.quantity)
    if (quantity === null) {
        throw new Error("quantity must be an integer between 1 and 100")
    }

    const projectsInUse = await countProjectsForCustomer(env, input.customer.id)
    if (quantity < projectsInUse) {
        throw new Error(
            `Seat count cannot be lower than projects in use (${projectsInUse}). Delete extra projects first.`
        )
    }

    await setPendingCheckoutQuantity(env, input.email, quantity)

    return createBillingCheckout(env, {
        email: input.email,
        customerId: input.customer.id,
        quantity,
        returnUrl: input.returnUrl,
    })
}
