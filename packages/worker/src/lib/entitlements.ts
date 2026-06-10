import {
    getPlan,
    isFreeAccessPlan,
    isPlanId,
    syncRemaining,
    type PlanDefinition,
    type PlanId,
    SyncBoundaryError,
} from "@nocms/shared"
import type { CustomerRow } from "../db/customers.js"
import type { Env } from "../env.js"
import { countProjectsForCustomer, incrementCustomerSyncCount } from "../db/customers.js"

export type CustomerUsage = {
    planId: PlanId
    plan: PlanDefinition
    projectCount: number
    syncCount: number
    syncRemaining: number | null
}

export function resolvePlanId(customer: CustomerRow | null): PlanId {
    const raw = customer?.plan_id
    if (raw && isPlanId(raw)) return raw
    return getPlan(null).id
}

/** Plan-aware entitlement — not wired to dashboard auth until commit 2. */
export function isPlanEntitled(customer: CustomerRow | null): boolean {
    const planId = resolvePlanId(customer)
    if (isFreeAccessPlan(planId)) return true
    const status = customer?.subscription_status
    return status === "active" || status === "trialing"
}

export async function getCustomerUsage(env: Env, customer: CustomerRow): Promise<CustomerUsage> {
    const plan = getPlan(customer.plan_id)
    const projectCount = await countProjectsForCustomer(env, customer.id)
    return {
        planId: plan.id,
        plan,
        projectCount,
        syncCount: customer.sync_count,
        syncRemaining: syncRemaining(plan, customer.sync_count),
    }
}

export async function assertProjectLimit(env: Env, customer: CustomerRow): Promise<void> {
    const plan = getPlan(customer.plan_id)
    const projectCount = await countProjectsForCustomer(env, customer.id)
    if (projectCount >= plan.projectLimit) {
        throw new SyncBoundaryError(
            "PLAN_LIMIT",
            `Your ${plan.name} plan allows ${plan.projectLimit} project${plan.projectLimit === 1 ? "" : "s"}. Upgrade to add more.`,
            { planId: plan.id, limit: plan.projectLimit, current: projectCount }
        )
    }
}

export async function assertSyncQuota(customer: CustomerRow): Promise<void> {
    const plan = getPlan(customer.plan_id)
    if (plan.syncQuota === null) return

    const remaining = syncRemaining(plan, customer.sync_count)
    if (remaining !== null && remaining <= 0) {
        throw new SyncBoundaryError(
            "PLAN_LIMIT",
            `You've used all ${plan.syncQuota} free syncs on ${plan.name}. Upgrade for unlimited syncs.`,
            { planId: plan.id, syncQuota: plan.syncQuota, syncCount: customer.sync_count }
        )
    }
}

export function assertPlanFeature(
    customer: CustomerRow,
    feature: keyof PlanDefinition["features"]
): void {
    const plan = getPlan(customer.plan_id)
    if (plan.features[feature]) return

    const label = feature === "autoSync" ? "Auto-sync" : "Auto-publish"
    throw new SyncBoundaryError(
        "PLAN_LIMIT",
        `${label} is not available on ${plan.name}. Upgrade your plan.`,
        { planId: plan.id, feature }
    )
}

/** Call after a successful CMS sync (commit 2). */
export async function recordSyncUsage(env: Env, customerId: string): Promise<void> {
    await incrementCustomerSyncCount(env, customerId)
}
