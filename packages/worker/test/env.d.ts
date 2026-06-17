declare namespace Cloudflare {
    interface Env {
        DB: D1Database
        TEST_MIGRATIONS: import("cloudflare:test").D1Migration[]
        WEB_APP_URL: string
    }
}
