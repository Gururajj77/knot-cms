import { applyD1Migrations, env, reset } from "cloudflare:test"
import { afterEach, describe, expect, it } from "vitest"
import { getLastPublishAt } from "../../src/db/sync-state.js"
import { updateProjectPublishSettings } from "../../src/db/projects.js"
import { createTestCustomer, createTestProject } from "../helpers/db-fixtures.js"
import { testEnv } from "../helpers/test-env.js"

async function seedSyncState(
    workerEnv: ReturnType<typeof testEnv>,
    projectId: string,
    lastPublishAt: string
): Promise<void> {
    await workerEnv.DB.prepare(`INSERT INTO sync_state (project_id, last_publish_at) VALUES (?, ?)`)
        .bind(projectId, lastPublishAt)
        .run()
}

describe("updateProjectPublishSettings", () => {
    afterEach(async () => {
        await reset()
        await applyD1Migrations(env.DB, env.TEST_MIGRATIONS)
    })

    it("clears publish cooldown whenever auto-publish is saved on", async () => {
        const customer = await createTestCustomer(testEnv(), "publish-clear@example.com", {
            planId: "paid",
        })
        const projectId = await createTestProject(testEnv(), customer.id, { autoPublish: false })
        await seedSyncState(testEnv(), projectId, new Date().toISOString())

        await updateProjectPublishSettings(testEnv(), projectId, { autoPublish: true })

        expect(await getLastPublishAt(testEnv(), projectId)).toBeNull()
    })

    it("clears publish cooldown when re-saving auto-publish while already on", async () => {
        const customer = await createTestCustomer(testEnv(), "publish-keep@example.com", {
            planId: "paid",
        })
        const projectId = await createTestProject(testEnv(), customer.id, { autoPublish: true })
        await seedSyncState(testEnv(), projectId, new Date().toISOString())

        await updateProjectPublishSettings(testEnv(), projectId, {
            autoPublish: true,
            publishMode: "preview_only",
        })

        expect(await getLastPublishAt(testEnv(), projectId)).toBeNull()
    })
})
