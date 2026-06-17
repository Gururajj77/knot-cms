import type { CustomerRow } from "../db/customers.js"
import { setCustomerBillingState } from "../db/customers.js"
import type { Env } from "../env.js"

const REMINDER_DAYS_BEFORE_RENEWAL = 2

function computePlanReminderAt(subscriptionRenewsAt: string | null | undefined): string | null {
    const renewsAt = subscriptionRenewsAt?.trim()
    if (!renewsAt) return null

    const reminder = new Date(renewsAt)
    reminder.setDate(reminder.getDate() - REMINDER_DAYS_BEFORE_RENEWAL)
    return reminder.toISOString()
}

export function isPlanReminderDue(customer: CustomerRow): boolean {
    const quantity = customer.pending_plan_quantity
    const reminderAt = customer.pending_plan_reminder_at?.trim()
    if (typeof quantity !== "number" || quantity < 1 || !reminderAt) return false
    return new Date(reminderAt).getTime() <= Date.now()
}

export function hasPendingCheckout(customer: CustomerRow | null): boolean {
    if (!customer) return false
    const quantity = customer.pending_checkout_quantity
    return typeof quantity === "number" && quantity >= 1
}

export async function setPendingCheckoutQuantity(
    env: Env,
    email: string,
    quantity: number | null
): Promise<void> {
    await setCustomerBillingState(env, email, {
        pendingCheckoutQuantity: quantity,
    })
}

export async function setDeferredPlanChange(
    env: Env,
    email: string,
    quantity: number,
    subscriptionRenewsAt: string | null
): Promise<{ reminderAt: string }> {
    const reminderAt = computePlanReminderAt(subscriptionRenewsAt)
    if (!reminderAt) {
        throw new Error("Your next billing date is not available yet. Click Refresh status, then try again.")
    }

    await setCustomerBillingState(env, email, {
        pendingPlanQuantity: quantity,
        pendingPlanReminderAt: reminderAt,
        pendingCheckoutQuantity: null,
    })

    return { reminderAt }
}

async function clearPendingPlanIntent(env: Env, email: string): Promise<void> {
    await setCustomerBillingState(env, email, {
        pendingCheckoutQuantity: null,
        pendingPlanQuantity: null,
        pendingPlanReminderAt: null,
    })
}

async function clearPendingCheckout(env: Env, email: string): Promise<void> {
    await setCustomerBillingState(env, email, {
        pendingCheckoutQuantity: null,
    })
}
