import type { SessionPayload } from "@knotcms/shared"
import { isAuthDevAllowAny } from "../auth/google-config.js"
import {
    ensureCustomerForEmail,
    ensureDevCustomer,
    getCustomerByEmail,
    getCustomerById,
} from "../db.js"
import type { CustomerRow } from "../db/customers.js"
import type { Env } from "../env.js"

export async function resolveAuthenticatedCustomerId(
    env: Env,
    session: SessionPayload,
    existingCustomer?: CustomerRow | null
): Promise<string | null> {
    const devBypass = isAuthDevAllowAny(env)

    if (session.sub.startsWith("dev:")) {
        if (devBypass) return ensureDevCustomer(env, session.email)
        return null
    }

    const customer =
        existingCustomer ??
        (await getCustomerById(env, session.sub)) ??
        (await getCustomerByEmail(env, session.email))

    if (customer?.id) return customer.id
    if (devBypass) return ensureDevCustomer(env, session.email)
    return (await ensureCustomerForEmail(env, session.email)).id
}
