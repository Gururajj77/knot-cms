import type { Env } from "../env.js"
import { resolveDodoApiBaseUrl } from "./dodo-checkout.js"

export interface DodoCustomerPortalSessionResponse {
    link: string
}

export async function createDodoCustomerPortalSession(
    env: Env,
    input: { externalCustomerId: string; returnUrl: string }
): Promise<{ url: string }> {
    const apiKey = env.DODO_API_KEY?.trim()
    if (!apiKey) {
        throw new Error("Dodo customer portal API is not configured")
    }

    const endpoint = new URL(
        `${resolveDodoApiBaseUrl(env)}/customers/${encodeURIComponent(input.externalCustomerId)}/customer-portal/session`
    )
    endpoint.searchParams.set("return_url", input.returnUrl)

    const response = await fetch(endpoint.toString(), {
        method: "POST",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        },
    })

    const body = (await response.json().catch(() => ({}))) as DodoCustomerPortalSessionResponse & {
        message?: string
        error?: string
    }

    if (!response.ok) {
        const detail = body.message ?? body.error ?? `Dodo portal failed (${response.status})`
        throw new Error(detail)
    }

    const link = body.link?.trim()
    if (!link) {
        throw new Error("Dodo portal response missing link")
    }

    return { url: link }
}
