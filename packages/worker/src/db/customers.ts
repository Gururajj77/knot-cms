import type { Env } from "../env.js"

export interface CustomerRow {
    id: string
    email: string
    billing_provider: string | null
    external_customer_id: string | null
    external_subscription_id: string | null
    subscription_status: string
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
