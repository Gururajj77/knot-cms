import type { PlanId } from "@knotcms/shared"
import { DEFAULT_PLAN_ID, isFreeAccessPlan, normalizePlanId } from "@knotcms/shared"
import type { Env } from "../env.js"

export interface CustomerRow {
    id: string
    email: string
    billing_provider: string | null
    external_customer_id: string | null
    external_subscription_id: string | null
    subscription_status: string
    plan_id: string
    sync_count: number
    subscription_cancel_at_period_end: number
    subscription_ends_at: string | null
    subscription_project_limit: number | null
}

export async function countProjectsForCustomer(env: Env, customerId: string): Promise<number> {
    const row = await env.DB.prepare(`SELECT COUNT(*) AS count FROM projects WHERE customer_id = ?`)
        .bind(customerId)
        .first<{ count: number }>()
    return row?.count ?? 0
}

export async function incrementCustomerSyncCount(env: Env, customerId: string): Promise<void> {
    await env.DB.prepare(
        `UPDATE customers SET sync_count = sync_count + 1, updated_at = datetime('now') WHERE id = ?`
    )
        .bind(customerId)
        .run()
}

export async function setCustomerPlanId(env: Env, customerId: string, planId: PlanId): Promise<void> {
    await env.DB.prepare(
        `UPDATE customers SET plan_id = ?, updated_at = datetime('now') WHERE id = ?`
    )
        .bind(planId, customerId)
        .run()
}

export async function getCustomerByEmail(env: Env, email: string): Promise<CustomerRow | null> {
    return env.DB.prepare(`SELECT * FROM customers WHERE LOWER(email) = LOWER(?)`)
        .bind(email.trim())
        .first<CustomerRow>()
}

export async function getCustomerById(env: Env, customerId: string): Promise<CustomerRow | null> {
    return env.DB.prepare(`SELECT * FROM customers WHERE id = ?`).bind(customerId).first<CustomerRow>()
}

export function isCustomerEntitled(customer: CustomerRow | null): boolean {
    if (!customer) return false
    const planId = normalizePlanId(customer.plan_id)
    if (isFreeAccessPlan(planId)) return true
    const status = customer.subscription_status
    return status === "active" || status === "trialing"
}

/** Ensure a customer row exists for signed-in Google users (basic plan by default). */
export async function ensureCustomerForEmail(env: Env, email: string): Promise<CustomerRow> {
    const existing = await getCustomerByEmail(env, email)
    if (existing) return existing

    const id = crypto.randomUUID()
    await env.DB.prepare(
        `INSERT INTO customers (id, email, plan_id, subscription_status, sync_count, updated_at)
         VALUES (?, ?, ?, 'inactive', 0, datetime('now'))`
    )
        .bind(id, email.trim().toLowerCase(), DEFAULT_PLAN_ID)
        .run()

    const created = await getCustomerById(env, id)
    if (!created) throw new Error("Failed to create customer")
    return created
}

export interface UpsertCustomerInput {
    email: string
    billingProvider: "polar"
    externalCustomerId: string
    externalSubscriptionId?: string | null
    subscriptionStatus?: string
    planId?: PlanId
    subscriptionProjectLimit?: number
}

export async function upsertCustomer(env: Env, input: UpsertCustomerInput): Promise<void> {
    const email = input.email.trim().toLowerCase()
    const id = crypto.randomUUID()
    const insertPlanId = input.planId ?? DEFAULT_PLAN_ID
    const insertSubscriptionStatus = input.subscriptionStatus ?? "inactive"
    const insertExternalSubscriptionId = input.externalSubscriptionId ?? null

    const updates = [
        "billing_provider = excluded.billing_provider",
        "external_customer_id = excluded.external_customer_id",
        "updated_at = datetime('now')",
    ]
    if (input.externalSubscriptionId !== undefined) {
        updates.push("external_subscription_id = excluded.external_subscription_id")
    }
    if (input.subscriptionStatus !== undefined) {
        updates.push("subscription_status = excluded.subscription_status")
    }
    if (input.planId !== undefined) {
        updates.push("plan_id = excluded.plan_id")
    }
    if (input.subscriptionProjectLimit !== undefined) {
        updates.push("subscription_project_limit = excluded.subscription_project_limit")
    }

    await env.DB.prepare(
        `INSERT INTO customers (
            id, email, billing_provider, external_customer_id,
            external_subscription_id, subscription_status, plan_id,
            subscription_project_limit, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(email) DO UPDATE SET
            ${updates.join(", ")}`
    )
        .bind(
            id,
            email,
            input.billingProvider,
            input.externalCustomerId,
            insertExternalSubscriptionId,
            insertSubscriptionStatus,
            insertPlanId,
            input.subscriptionProjectLimit ?? null
        )
        .run()
}

export async function setCustomerBillingState(
    env: Env,
    email: string,
    patch: {
        planId?: PlanId
        subscriptionProjectLimit?: number
        cancelAtPeriodEnd?: boolean
        subscriptionEndsAt?: string | null
    }
): Promise<void> {
    const sets: string[] = ["updated_at = datetime('now')"]
    const binds: unknown[] = []

    if (patch.planId) {
        sets.push("plan_id = ?")
        binds.push(patch.planId)
    }
    if (patch.subscriptionProjectLimit !== undefined) {
        sets.push("subscription_project_limit = ?")
        binds.push(patch.subscriptionProjectLimit)
    }
    if (patch.cancelAtPeriodEnd !== undefined) {
        sets.push("subscription_cancel_at_period_end = ?")
        binds.push(patch.cancelAtPeriodEnd ? 1 : 0)
    }
    if (patch.subscriptionEndsAt !== undefined) {
        sets.push("subscription_ends_at = ?")
        binds.push(patch.subscriptionEndsAt)
    }

    binds.push(email.trim())
    await env.DB.prepare(
        `UPDATE customers SET ${sets.join(", ")} WHERE LOWER(email) = LOWER(?)`
    )
        .bind(...binds)
        .run()
}

/** Dev-only: ensure a customer row exists so projects can be owned. */
export async function ensureDevCustomer(env: Env, email: string): Promise<string> {
    const existing = await getCustomerByEmail(env, email)
    if (existing) return existing.id

    const id = crypto.randomUUID()
    await env.DB.prepare(
        `INSERT INTO customers (id, email, plan_id, subscription_status, updated_at) VALUES (?, ?, ?, 'active', datetime('now'))`
    )
        .bind(id, email.trim().toLowerCase(), DEFAULT_PLAN_ID)
        .run()
    return id
}

export async function setCustomerSubscriptionSchedule(
    env: Env,
    email: string,
    patch: { cancelAtPeriodEnd: boolean; subscriptionEndsAt: string | null }
): Promise<void> {
    await setCustomerBillingState(env, email, patch)
}

export async function updateCustomerByExternalCustomerId(
    env: Env,
    externalCustomerId: string,
    patch: {
        externalSubscriptionId?: string | null
        subscriptionStatus: string
    }
): Promise<void> {
    await env.DB.prepare(
        `UPDATE customers SET
            external_subscription_id = COALESCE(?, external_subscription_id),
            subscription_status = ?,
            updated_at = datetime('now')
         WHERE external_customer_id = ?`
    )
        .bind(
            patch.externalSubscriptionId ?? null,
            patch.subscriptionStatus,
            externalCustomerId
        )
        .run()
}
