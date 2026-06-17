import { applyD1Migrations, env, reset } from "cloudflare:test"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
    clearDebounce,
    getDebounceScheduledAt,
    scheduleDebounceSync,
} from "../../src/db/sync-state.js"
import { testEnv } from "../helpers/test-env.js"

describe("scheduleDebounceSync", () => {
    const projectId = "debounce-test-project"

    beforeEach(async () => {
        await applyD1Migrations(env.DB, env.TEST_MIGRATIONS)
    })

    afterEach(async () => {
        await reset()
    })

    it("returns true on first webhook and false while a burst is pending", async () => {
        const workerEnv = testEnv()

        expect(await scheduleDebounceSync(workerEnv, projectId)).toBe(true)
        expect(await getDebounceScheduledAt(workerEnv, projectId)).not.toBeNull()

        expect(await scheduleDebounceSync(workerEnv, projectId)).toBe(false)
        expect(await scheduleDebounceSync(workerEnv, projectId)).toBe(false)
    })

    it("returns true again after debounce is cleared (new burst)", async () => {
        const workerEnv = testEnv()

        expect(await scheduleDebounceSync(workerEnv, projectId)).toBe(true)
        await clearDebounce(workerEnv, projectId)

        expect(await scheduleDebounceSync(workerEnv, projectId)).toBe(true)
    })
})
