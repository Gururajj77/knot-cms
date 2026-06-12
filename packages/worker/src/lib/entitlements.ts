import {
    effectiveProjectLimit,
    excessProjectCount,
    getPlan,
    isFreeAccessPlan,
    isOverProjectLimit,
    normalizePlanId,
    syncRemaining,
    type PlanDefinition,
    type PlanId,
    SyncBoundaryError,
} from "@knotcms/shared"
import type { CustomerRow } from "../db/customers.js"
import type { Env } from "../env.js"
import {
    countProjectsForCustomer,
    getCustomerById,
    incrementCustomerSyncCount,
} from "../db/customers.js"

export type CustomerUsage = {
    planId: PlanId
    plan: PlanDefinition
    projectCount: number
    projectLimit: number
    syncCount: number
    syncRemaining: number | null
}

export function resolvePlanId(customer: CustomerRow | null): PlanId {
    return normalizePlanId(customer?.plan_id)
}

export function isPlanEntitled(customer: CustomerRow | null): boolean {
    const planId = resolvePlanId(customer)
    if (isFreeAccessPlan(planId)) return true
    const status = customer?.subscription_status
    return status === "active" || status === "trialing"
}

export function customerProjectLimit(customer: CustomerRow): number {
    return effectiveProjectLimit(customer)
}

export async function getCustomerUsage(env: Env, customer: CustomerRow): Promise<CustomerUsage> {
    const planId = resolvePlanId(customer)
    const plan = getPlan(planId)
    const projectCount = await countProjectsForCustomer(env, customer.id)
    const projectLimit = customerProjectLimit(customer)
    return {
        planId,
        plan,
        projectCount,
        projectLimit,
        syncCount: customer.sync_count,
        syncRemaining: syncRemaining(plan, customer.sync_count),
    }
}

export function customerOverProjectLimit(projectCount: number, customer: CustomerRow): boolean {
    return isOverProjectLimit(projectCount, customerProjectLimit(customer))
}

export async function assertWithinProjectUsageLimit(
    env: Env,
    customer: CustomerRow
): Promise<void> {
    const plan = getPlan(customer.plan_id)
    const projectLimit = customerProjectLimit(customer)
    const projectCount = await countProjectsForCustomer(env, customer.id)
    if (!isOverProjectLimit(projectCount, projectLimit)) return

    const excess = excessProjectCount(projectCount, projectLimit)
    throw new SyncBoundaryError(
        "PLAN_LIMIT",
        `You have ${projectCount} projects but your plan allows ${projectLimit}. Delete ${excess} project${excess === 1 ? "" : "s"} or add more projects in Polar.`,
        {
            planId: plan.id,
            limit: projectLimit,
            current: projectCount,
            reason: "projects_over_limit",
        }
    )
}

export async function assertProjectLimit(env: Env, customer: CustomerRow): Promise<void> {
    const plan = getPlan(customer.plan_id)
    const projectLimit = customerProjectLimit(customer)
    const projectCount = await countProjectsForCustomer(env, customer.id)
    if (projectCount >= projectLimit) {
        throw new SyncBoundaryError(
            "PLAN_LIMIT",
            `Your plan allows ${projectLimit} project${projectLimit === 1 ? "" : "s"}. Add more in Polar or delete an existing project.`,
            { planId: plan.id, limit: projectLimit, current: projectCount }
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
            `You've used all ${plan.syncQuota} free syncs on ${plan.name}. Subscribe for unlimited syncs.`,
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
        `${label} is not available on ${plan.name}. Subscribe to unlock automation.`,
        { planId: plan.id, feature }
    )
}

export async function recordSyncUsage(env: Env, customerId: string): Promise<void> {
    await incrementCustomerSyncCount(env, customerId)
}

export async function assertSyncAllowed(env: Env, customerId: string | null): Promise<CustomerRow | null> {
    if (!customerId) return null
    const customer = await getCustomerById(env, customerId)
    if (!customer) {
        throw new SyncBoundaryError("LICENSE_INACTIVE", "Subscription inactive")
    }
    if (!isPlanEntitled(customer)) {
        throw new SyncBoundaryError("LICENSE_INACTIVE", "Subscription inactive")
    }
    await assertWithinProjectUsageLimit(env, customer)
    await assertSyncQuota(customer)
    return customer
}
