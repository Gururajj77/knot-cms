import {
    excessProjectCount,
    getPlan,
    isFreeAccessPlan,
    isOverProjectLimit,
    isPlanId,
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
    syncCount: number
    syncRemaining: number | null
}

export function resolvePlanId(customer: CustomerRow | null): PlanId {
    const raw = customer?.plan_id
    if (raw && isPlanId(raw)) return raw
    return getPlan(null).id
}

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

export function customerOverProjectLimit(projectCount: number, customer: CustomerRow): boolean {
    const plan = getPlan(customer.plan_id)
    return isOverProjectLimit(projectCount, plan.projectLimit)
}

export async function assertWithinProjectUsageLimit(
    env: Env,
    customer: CustomerRow
): Promise<void> {
    const plan = getPlan(customer.plan_id)
    const projectCount = await countProjectsForCustomer(env, customer.id)
    if (!isOverProjectLimit(projectCount, plan.projectLimit)) return

    const excess = excessProjectCount(projectCount, plan.projectLimit)
    throw new SyncBoundaryError(
        "PLAN_LIMIT",
        `You have ${projectCount} projects but ${plan.name} allows ${plan.projectLimit}. Delete ${excess} project${excess === 1 ? "" : "s"} to resume syncing.`,
        {
            planId: plan.id,
            limit: plan.projectLimit,
            current: projectCount,
            reason: "projects_over_limit",
        }
    )
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
