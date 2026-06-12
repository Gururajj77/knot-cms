import { effectiveRateLimit, type PlanRateLimitAction } from "@knotcms/shared"
import type { CustomerRow } from "../db/customers.js"
import type { Env } from "../env.js"

/** Best-effort per-isolate rate limit when KV is not bound. */
const buckets = new Map<string, number[]>()

export function allowRateLimitedAction(key: string, max: number, windowMs: number): boolean {
    const now = Date.now()
    const hits = (buckets.get(key) ?? []).filter(t => now - t < windowMs)
    if (hits.length >= max) return false
    hits.push(now)
    buckets.set(key, hits)
    return true
}

export async function checkRateLimit(
    env: Env,
    key: string,
    max: number,
    windowMs: number
): Promise<boolean> {
    if (!env.RATE_LIMIT) {
        return allowRateLimitedAction(key, max, windowMs)
    }

    const windowKey = `${key}:${Math.floor(Date.now() / windowMs)}`
    const current = await env.RATE_LIMIT.get(windowKey)
    const count = current ? Number.parseInt(current, 10) : 0
    if (count >= max) return false

    await env.RATE_LIMIT.put(windowKey, String(count + 1), {
        expirationTtl: Math.ceil(windowMs / 1000) + 1,
    })
    return true
}

export type { PlanRateLimitAction }

export async function checkPlanRateLimit(
    env: Env,
    customer: CustomerRow | null,
    action: PlanRateLimitAction,
    keySuffix: string
): Promise<boolean> {
    const { max, windowMs } = effectiveRateLimit(
        {
            plan_id: customer?.plan_id ?? "basic",
            subscription_project_limit: customer?.subscription_project_limit,
        },
        action
    )
    return checkRateLimit(env, `${action}:${keySuffix}`, max, windowMs)
}
