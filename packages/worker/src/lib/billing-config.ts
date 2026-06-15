import type { BillingProvider } from "@knotcms/shared"
import type { Env } from "../env.js"

export function resolveBillingProvider(env: Env): BillingProvider | null {
    const raw = env.BILLING_PROVIDER?.trim().toLowerCase()
    if (raw === "polar" || raw === "dodo" || raw === "manual") return raw
    return null
}

export type BillingSecretName =
    | "BILLING_WEBHOOK_SECRET"
    | "BILLING_CHECKOUT_URL_PAID"
    | "BILLING_CUSTOMER_PORTAL_URL"
    | "POLAR_PROJECT_PRODUCT_ID"
    | "DODO_API_KEY"
    | "DODO_WEBHOOK_SECRET"
    | "DODO_PROJECT_PRODUCT_ID"
    | "DODO_CHECKOUT_URL_PAID"
    | "DODO_CUSTOMER_PORTAL_URL"

export interface BillingConfigStatus {
    provider: BillingProvider | null
    webhookReady: boolean
    webhookError: string | null
    missingSecrets: BillingSecretName[]
    warnings: string[]
}

function missingSecret(env: Env, key: BillingSecretName): boolean {
    const value = env[key]
    return typeof value !== "string" || !value.trim()
}

export function listPolarBillingSecrets(env: Env): BillingSecretName[] {
    const missing: BillingSecretName[] = []
    if (missingSecret(env, "BILLING_WEBHOOK_SECRET")) missing.push("BILLING_WEBHOOK_SECRET")
    if (missingSecret(env, "BILLING_CHECKOUT_URL_PAID")) missing.push("BILLING_CHECKOUT_URL_PAID")
    if (missingSecret(env, "POLAR_PROJECT_PRODUCT_ID")) missing.push("POLAR_PROJECT_PRODUCT_ID")
    return missing
}

export function listDodoBillingSecrets(env: Env): BillingSecretName[] {
    const missing: BillingSecretName[] = []
    if (missingSecret(env, "DODO_API_KEY")) missing.push("DODO_API_KEY")
    if (missingSecret(env, "DODO_WEBHOOK_SECRET")) missing.push("DODO_WEBHOOK_SECRET")
    if (missingSecret(env, "DODO_PROJECT_PRODUCT_ID")) missing.push("DODO_PROJECT_PRODUCT_ID")
    return missing
}

/** Returns an error message when webhooks cannot be processed, or null when ready. */
export function getBillingWebhookConfigError(env: Env): string | null {
    const provider = resolveBillingProvider(env)
    if (!provider) return "Billing provider not configured"

    if (provider === "polar") {
        if (missingSecret(env, "BILLING_WEBHOOK_SECRET")) {
            return "Billing webhook secret not configured"
        }
        return null
    }

    if (provider === "dodo") {
        if (missingSecret(env, "DODO_WEBHOOK_SECRET")) {
            return "Dodo webhook secret not configured"
        }
        if (missingSecret(env, "DODO_PROJECT_PRODUCT_ID")) {
            return "Dodo project product not configured"
        }
        return null
    }

    return "Billing provider not configured"
}

export function getBillingConfigStatus(env: Env): BillingConfigStatus {
    const provider = resolveBillingProvider(env)
    const webhookError = getBillingWebhookConfigError(env)
    const warnings: string[] = []

    let missingSecrets: BillingSecretName[] = []
    if (provider === "polar") {
        missingSecrets = listPolarBillingSecrets(env)
        if (missingSecret(env, "BILLING_CUSTOMER_PORTAL_URL")) {
            warnings.push("BILLING_CUSTOMER_PORTAL_URL is unset — seat changes use Polar portal")
        }
    } else if (provider === "dodo") {
        missingSecrets = listDodoBillingSecrets(env)
        if (missingSecret(env, "DODO_CHECKOUT_URL_PAID")) {
            warnings.push("DODO_CHECKOUT_URL_PAID is unset — checkout links disabled until Phase 4 API")
        }
        if (missingSecret(env, "DODO_CUSTOMER_PORTAL_URL")) {
            const portalApiReady = !missingSecret(env, "DODO_API_KEY")
            warnings.push(
                portalApiReady
                    ? "DODO_CUSTOMER_PORTAL_URL is unset — portal uses API"
                    : "DODO_CUSTOMER_PORTAL_URL is unset — set API key or static portal URL"
            )
        }
    }

    return {
        provider,
        webhookReady: webhookError === null,
        webhookError,
        missingSecrets,
        warnings,
    }
}
