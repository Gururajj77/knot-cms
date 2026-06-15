import { env } from "cloudflare:workers"
import type { Env } from "../../src/env.js"
import {
    TEST_ENCRYPTION_KEY,
    TEST_SESSION_SIGNING_SECRET,
    TEST_WEBHOOK_SECRET,
} from "./test-secrets.js"
import { TEST_DODO_PRODUCT_ID } from "./dodo-webhook.js"

/** Worker bindings only — never spread .dev.vars secrets into unit tests. */
function workerBindings(workerEnv: Env): Pick<Env, "DB" | "SYNC_QUEUE" | "RATE_LIMIT" | "ASSETS"> {
    return {
        DB: workerEnv.DB,
        SYNC_QUEUE: workerEnv.SYNC_QUEUE,
        ...(workerEnv.RATE_LIMIT ? { RATE_LIMIT: workerEnv.RATE_LIMIT } : {}),
        ...(workerEnv.ASSETS ? { ASSETS: workerEnv.ASSETS } : {}),
    }
}

function resolveTestSessionSecret(overrides: Partial<Env>): string {
    return overrides.SESSION_SIGNING_SECRET?.trim() || TEST_SESSION_SIGNING_SECRET
}

const TEST_APP_ORIGIN = "http://localhost:8787"

/** Deterministic env for vitest — isolated from developer .dev.vars. */
export function testEnv(overrides: Partial<Env> = {}): Env {
    const workerEnv = env as unknown as Env
    const sessionSecret = resolveTestSessionSecret(overrides)

    return {
        ...workerBindings(workerEnv),
        WORKER_PUBLIC_URL: TEST_APP_ORIGIN,
        WEB_APP_URL: TEST_APP_ORIGIN,
        GOOGLE_REDIRECT_URI: `${TEST_APP_ORIGIN}/auth/google/callback`,
        NOTION_REDIRECT_URI: `${TEST_APP_ORIGIN}/oauth/notion/callback`,
        NOTION_CLIENT_ID: "test-notion-client-id",
        NOTION_CLIENT_SECRET: "test-notion-client-secret",
        GOOGLE_CLIENT_ID: "test-google-client-id",
        GOOGLE_CLIENT_SECRET: "test-google-client-secret",
        ENCRYPTION_KEY: TEST_ENCRYPTION_KEY,
        SESSION_SIGNING_SECRET: sessionSecret,
        BILLING_PROVIDER: "polar",
        BILLING_WEBHOOK_SECRET: TEST_WEBHOOK_SECRET,
        ...overrides,
    }
}

export function dodoTestEnv(overrides: Partial<Env> = {}): Env {
    return testEnv({
        BILLING_PROVIDER: "dodo",
        DODO_API_KEY: "dodo_test_api_key",
        DODO_WEBHOOK_SECRET: TEST_WEBHOOK_SECRET,
        DODO_PROJECT_PRODUCT_ID: TEST_DODO_PRODUCT_ID,
        ...overrides,
    })
}
