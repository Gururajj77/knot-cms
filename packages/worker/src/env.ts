import type { SyncJobMessage } from "./sync/syncQueue.js"

export interface Env {
    DB: D1Database
    /** Sliding-window rate limits (commit 2). Create: wrangler kv namespace create RATE_LIMIT */
    RATE_LIMIT?: KVNamespace
    SYNC_QUEUE: Queue<SyncJobMessage>
    ASSETS?: Fetcher
    NOTION_CLIENT_ID: string
    NOTION_CLIENT_SECRET: string
    ENCRYPTION_KEY: string
    LICENSE_SIGNING_SECRET: string
    SESSION_SIGNING_SECRET?: string
    WORKER_PUBLIC_URL: string
    NOTION_REDIRECT_URI: string
    GOOGLE_CLIENT_ID: string
    GOOGLE_CLIENT_SECRET: string
    GOOGLE_REDIRECT_URI: string
    WEB_APP_URL: string
    /** When "true", any Google account can log in without an active subscription. */
    AUTH_DEV_ALLOW_ANY?: string
    BILLING_PROVIDER?: string
    BILLING_WEBHOOK_SECRET?: string
    /** @deprecated Use BILLING_CHECKOUT_URL_PRO — kept as Pro fallback */
    BILLING_CHECKOUT_URL?: string
    BILLING_CHECKOUT_URL_PRO?: string
    BILLING_CHECKOUT_URL_MAX?: string
    /** Polar customer portal, e.g. https://polar.sh/your-org/portal */
    BILLING_CUSTOMER_PORTAL_URL?: string
    /** Polar product IDs (prod_…) for webhook plan mapping — not checkout URLs */
    POLAR_PRO_PRODUCT_ID?: string
    POLAR_MAX_PRODUCT_ID?: string
}
