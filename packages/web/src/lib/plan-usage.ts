import type { AuthMeUsage } from "./api/auth"

export function canCreateProject(usage: AuthMeUsage | null | undefined): boolean {
    if (!usage) return true
    return usage.projectCount < usage.projectLimit
}

export function canSync(usage: AuthMeUsage | null | undefined): boolean {
    if (!usage) return true
    if (usage.syncRemaining === null) return true
    return usage.syncRemaining > 0
}

export function hasAutoSync(usage: AuthMeUsage | null | undefined): boolean {
    return usage?.features.autoSync ?? false
}

export function hasAutoPublish(usage: AuthMeUsage | null | undefined): boolean {
    return usage?.features.autoPublish ?? false
}

export type PlanUsageAlert = "projects" | "syncs" | "projects-full" | "syncs-exhausted"

/** Returns the most urgent usage alert, if any. */
export function planUsageAlert(usage: AuthMeUsage | null | undefined): PlanUsageAlert | null {
    if (!usage) return null

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
    if (usage.projectLimit === 1 && usage.projectCount >= 1) {
        return "projects-full"
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
    return planId === "basic"
}

export function projectLimitReachedMessage(planId: string | undefined): string {
    if (planId === "basic") {
        return "Project limit reached. Pick Pro or Max below for unlimited syncs and automation."
    }
    return "Project limit reached on your current plan."
}

export function hasManualSyncQuota(usage: AuthMeUsage): boolean {
    return usage.syncRemaining !== null
}
