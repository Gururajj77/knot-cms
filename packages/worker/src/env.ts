export interface Env {
    DB: D1Database
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
}
