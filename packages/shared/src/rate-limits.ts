import type { PlanRateLimitAction } from "./plans.js"

export const RATE_LIMITED_CODE = "RATE_LIMITED" as const

/** User-facing copy when a burst rate limit is exceeded. */
export const RATE_LIMIT_MESSAGES: Record<PlanRateLimitAction, string> = {
    manualSync:
        "You're syncing too quickly. Wait about a minute, then try again.",
    framerVerify:
        "Too many Framer connection checks. Wait about a minute, then try again.",
    createProject:
        "Too many project changes in a short time. Wait about a minute, then try again.",
    setupSession:
        "Too many setup attempts. Wait about a minute, then try again.",
    projectRead:
        "You're refreshing too quickly. Wait a few seconds, then try again.",
    webhookConfirm:
        "Too many webhook checks. Wait about a minute, then try again.",
    setupDataSource:
        "Too many requests while loading your content. Wait about a minute, then try again.",
    bootstrapDatabase:
        "Too many database setup attempts. Wait about a minute, then try again.",
}

export function rateLimitErrorBody(action: PlanRateLimitAction): {
    error: string
    code: typeof RATE_LIMITED_CODE
} {
    return {
        error: RATE_LIMIT_MESSAGES[action],
        code: RATE_LIMITED_CODE,
    }
}
