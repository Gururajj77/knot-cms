import type { Env } from "../env.js"
import { canUseDodoCheckoutApi } from "./billing-checkout-api.js"

export function canUseDodoSeatsApi(env: Env): boolean {
    return canUseDodoCheckoutApi(env)
}

export function usesBillingSeatsApi(env: Env): boolean {
    return canUseDodoSeatsApi(env)
}

export function toUserFacingSeatChangeError(message: string): string {
    const passthrough = [
        "only available with Dodo",
        "not configured",
        "active subscription",
        "quantity must be",
        "projects in use",
        "Lowering seats",
        "No subscription linked",
    ]
    if (passthrough.some(part => message.includes(part))) return message
    if (/pending plan change/i.test(message) || message.includes("PENDING_PLAN_CHANGE_PAYMENT")) {
        return "A seat change from an earlier attempt is still processing in Dodo. Wait for that payment to finish, clear it in your Dodo dashboard, or use Cancel and start fresh to replace your subscription."
    }
    return "We couldn't update your subscription right now. Please try again in a few minutes."
}
