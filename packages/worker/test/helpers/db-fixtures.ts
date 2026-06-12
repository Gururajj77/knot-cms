import type { PlanId } from "@knotcms/shared"
import { DEFAULT_PLAN_ID } from "@knotcms/shared"
import type { Env } from "../../src/env.js"

export interface FixtureCustomer {
    id: string
    email: string
}

export async function createTestCustomer(
    env: Env,
    email: string,
    opts: {
        planId?: PlanId
        subscriptionStatus?: string
        subscriptionProjectLimit?: number | null
        cancelAtPeriodEnd?: boolean
        subscriptionEndsAt?: string | null
    } = {}
): Promise<FixtureCustomer> {
    const id = crypto.randomUUID()
    const planId = opts.planId ?? DEFAULT_PLAN_ID
    const subscriptionStatus =
        opts.subscriptionStatus ?? (planId === "basic" ? "inactive" : "active")

    await env.DB.prepare(
        `INSERT INTO customers (
            id, email, plan_id, subscription_status, sync_count,
            subscription_project_limit,
            subscription_cancel_at_period_end, subscription_ends_at, updated_at
        ) VALUES (?, ?, ?, ?, 0, ?, ?, ?, datetime('now'))`
    )
        .bind(
            id,
            email.trim().toLowerCase(),
            planId,
            subscriptionStatus,
            opts.subscriptionProjectLimit ?? (planId === "paid" ? 1 : null),
            opts.cancelAtPeriodEnd ? 1 : 0,
            opts.subscriptionEndsAt ?? null
        )
        .run()

    return { id, email: email.trim().toLowerCase() }
}

export async function createTestProject(
    env: Env,
    customerId: string,
    opts: { autoSync?: boolean; autoPublish?: boolean; suffix?: string } = {}
): Promise<string> {
    const id = crypto.randomUUID()
    const suffix = opts.suffix ?? id.slice(0, 8)

    await env.DB.prepare(
        `INSERT INTO projects (
            id, customer_id, framer_project_url, framer_collection_id,
            source_provider, source_data_source_id, slug_source_property_id,
            auto_sync, auto_publish
        ) VALUES (?, ?, ?, 'col', 'notion', ?, 'slug', ?, ?)`
    )
        .bind(
            id,
            customerId,
            `https://framer.com/p/${suffix}`,
            `ds-${suffix}`,
            opts.autoSync === false ? 0 : 1,
            opts.autoPublish ? 1 : 0
        )
        .run()

    return id
}
