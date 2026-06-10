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
    BILLING_CHECKOUT_URL?: string
    /** Polar product IDs — also configurable in shared billing-map.ts */
    POLAR_PRO_PRODUCT_ID?: string
    POLAR_MAX_PRODUCT_ID?: string
}
