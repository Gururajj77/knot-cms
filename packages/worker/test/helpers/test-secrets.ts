/** Fixed secrets for vitest — CI has no .dev.vars. */
export const TEST_WEBHOOK_SECRET = "test-webhook-secret"
export const TEST_SESSION_SIGNING_SECRET = "test-session-signing-secret"
/** 32-byte key (base64) for encrypt/decrypt in DB tests. */
export const TEST_ENCRYPTION_KEY = "oXS6d07Iza8Ih5hnvPpnqOumLKO0cfKa5oZdlGTPIzQ="
