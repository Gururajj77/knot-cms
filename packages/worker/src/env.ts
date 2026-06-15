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
    SESSION_SIGNING_SECRET: string
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
    /** Per-project seat-based product checkout (Polar checkout link redirect URL). */
    BILLING_CHECKOUT_URL_PAID?: string
    /** @deprecated Use BILLING_CHECKOUT_URL_PAID */
    BILLING_CHECKOUT_URL?: string
    /** @deprecated Use BILLING_CHECKOUT_URL_PAID */
    BILLING_CHECKOUT_URL_PRO?: string
    /** @deprecated Legacy Max checkout — ignored */
    BILLING_CHECKOUT_URL_MAX?: string
    /** Polar customer portal, e.g. https://polar.sh/your-org/portal */
    BILLING_CUSTOMER_PORTAL_URL?: string
    /** Seat-based project product ID (prod_…) for webhook mapping */
    POLAR_PROJECT_PRODUCT_ID?: string
    /** @deprecated Use POLAR_PROJECT_PRODUCT_ID */
    POLAR_PRO_PRODUCT_ID?: string
    /** @deprecated Use POLAR_PROJECT_PRODUCT_ID */
    POLAR_MAX_PRODUCT_ID?: string
    /** Dodo Payments API key (Phase 3+) */
    DODO_API_KEY?: string
    /** `test` (default) or `live` — selects Dodo API host */
    DODO_PAYMENTS_ENVIRONMENT?: string
    /** Override Dodo API base URL (optional) */
    DODO_API_BASE_URL?: string
    /** Dodo webhook signing secret (Phase 3+) */
    DODO_WEBHOOK_SECRET?: string
    /** Seat-based project product ID in Dodo (Phase 3+) */
    DODO_PROJECT_PRODUCT_ID?: string
    /** Dodo customer portal URL (Phase 5+) */
    DODO_CUSTOMER_PORTAL_URL?: string
    /** Static Dodo checkout link (optional until Phase 4 API checkout) */
    DODO_CHECKOUT_URL_PAID?: string
}
