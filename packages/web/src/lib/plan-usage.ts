import { isFreeAccessPlan, isPaidPlan, PRICE_PER_PROJECT_MONTHLY_USD } from "@knotcms/shared"
import type { AuthMeUsage } from "./api/auth"

export function isOverProjectLimit(usage: AuthMeUsage | null | undefined): boolean {
    if (!usage) return false
    return usage.projectCount > usage.projectLimit
}

export function excessProjectCount(usage: AuthMeUsage): number {
    return Math.max(0, usage.projectCount - usage.projectLimit)
}

export function canCreateProject(usage: AuthMeUsage | null | undefined): boolean {
    if (!usage) return true
    return usage.projectCount < usage.projectLimit
}

export function canSync(usage: AuthMeUsage | null | undefined): boolean {
    if (!usage) return true
    if (isOverProjectLimit(usage)) return false
    if (usage.syncRemaining === null) return true
    return usage.syncRemaining > 0
}

export function canUseProjectFeatures(usage: AuthMeUsage | null | undefined): boolean {
    return !isOverProjectLimit(usage)
}

export function hasAutoSync(usage: AuthMeUsage | null | undefined): boolean {
    if (isOverProjectLimit(usage)) return false
    return usage?.features.autoSync ?? false
}

export function hasAutoPublish(usage: AuthMeUsage | null | undefined): boolean {
    if (isOverProjectLimit(usage)) return false
    return usage?.features.autoPublish ?? false
}

export type PlanUsageAlert =
    | "projects-over-limit"
    | "projects"
    | "syncs"
    | "projects-full"
    | "syncs-exhausted"

/** Returns the most urgent usage alert, if any. */
export function planUsageAlert(usage: AuthMeUsage | null | undefined): PlanUsageAlert | null {
    if (!usage) return null

    if (usage.projectCount > usage.projectLimit) {
        return "projects-over-limit"
    }
    if (usage.projectCount >= usage.projectLimit) {
        return "projects-full"
    }
    if (usage.syncRemaining !== null && usage.syncRemaining <= 0) {
        return "syncs-exhausted"
    }
    if (usage.syncRemaining !== null && usage.syncRemaining <= 1) {
        return "syncs"
    }
    if (usage.projectCount >= usage.projectLimit - 1 && usage.projectLimit > 1) {
        return "projects"
    }

    return null
}

export function projectUsagePercent(usage: AuthMeUsage): number {
    if (usage.projectLimit <= 0) return 100
    return Math.min(100, Math.round((usage.projectCount / usage.projectLimit) * 100))
}

export function syncUsagePercent(usage: AuthMeUsage): number | null {
    if (usage.syncRemaining === null) return null
    const total = usage.syncCount + usage.syncRemaining
    if (total <= 0) return 0
    return Math.min(100, Math.round((usage.syncCount / total) * 100))
}

export function isFreePlan(planId: string | undefined): boolean {
    return isFreeAccessPlan(planId)
}

export function projectLimitReachedMessage(planId: string | undefined): string {
    if (isFreePlan(planId)) {
        return `Project limit reached. Subscribe on your profile ($${PRICE_PER_PROJECT_MONTHLY_USD} per project) for more slots and automation.`
    }
    return "Seat limit reached. Add seats on your profile or delete an existing project."
}

export function projectsOverLimitMessage(usage: AuthMeUsage): string {
    const excess = excessProjectCount(usage)
    if (isPaidPlan(usage.planId)) {
        return `You have ${usage.projectCount} projects but your subscription covers ${usage.projectLimit} seat${usage.projectLimit === 1 ? "" : "s"}. Delete ${excess} project${excess === 1 ? "" : "s"} or add seats on your profile.`
    }
    return `You have ${usage.projectCount} projects but ${usage.planName} allows ${usage.projectLimit}. Delete ${excess} project${excess === 1 ? "" : "s"} to resume syncing.`
}

export function hasManualSyncQuota(usage: AuthMeUsage): boolean {
    return usage.syncRemaining !== null
}
