import type { PlanId } from "@nocms/shared"
import { DEFAULT_PLAN_ID } from "@nocms/shared"
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
    return customer?.subscription_status === "active"
}

export interface UpsertCustomerInput {
    email: string
    billingProvider: "polar"
    externalCustomerId: string
    externalSubscriptionId: string | null
    subscriptionStatus: string
}

export async function upsertCustomer(env: Env, input: UpsertCustomerInput): Promise<void> {
    const email = input.email.trim().toLowerCase()
    const id = crypto.randomUUID()

    await env.DB.prepare(
        `INSERT INTO customers (
            id, email, billing_provider, external_customer_id,
            external_subscription_id, subscription_status, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(email) DO UPDATE SET
            billing_provider = excluded.billing_provider,
            external_customer_id = excluded.external_customer_id,
            external_subscription_id = excluded.external_subscription_id,
            subscription_status = excluded.subscription_status,
            updated_at = datetime('now')`
    )
        .bind(
            id,
            email,
            input.billingProvider,
            input.externalCustomerId,
            input.externalSubscriptionId,
            input.subscriptionStatus
        )
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
