import { env } from "cloudflare:workers"
import type { Env } from "../../src/env.js"
import { TEST_SESSION_SIGNING_SECRET, TEST_WEBHOOK_SECRET } from "./test-secrets.js"
import { TEST_DODO_PRODUCT_ID } from "./dodo-webhook.js"

function resolveTestSessionSecret(workerEnv: Env, overrides: Partial<Env>): string {
    return (
        overrides.SESSION_SIGNING_SECRET?.trim() ||
        workerEnv.SESSION_SIGNING_SECRET?.trim() ||
        TEST_SESSION_SIGNING_SECRET
    )
}

export function testEnv(overrides: Partial<Env> = {}): Env {
    const workerEnv = env as unknown as Env
    const sessionSecret = resolveTestSessionSecret(workerEnv, overrides)

    return {
        ...workerEnv,
        BILLING_PROVIDER: "polar",
        BILLING_WEBHOOK_SECRET: TEST_WEBHOOK_SECRET,
        SESSION_SIGNING_SECRET: sessionSecret,
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
