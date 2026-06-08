import { env } from "cloudflare:workers"
import type { Env } from "../../src/env.js"
import { TEST_WEBHOOK_SECRET } from "./polar-webhook.js"

export function testEnv(overrides: Partial<Env> = {}): Env {
    return {
        ...(env as unknown as Env),
        BILLING_PROVIDER: "polar",
        BILLING_WEBHOOK_SECRET: TEST_WEBHOOK_SECRET,
        ...overrides,
    }
}
