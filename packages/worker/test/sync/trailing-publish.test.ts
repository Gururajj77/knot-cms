import { applyD1Migrations, env, reset } from "cloudflare:test"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
    getPublishPending,
    getPublishScheduledAt,
    markPublishPending,
} from "../../src/db/sync-state.js"
import { scheduleTrailingPublish } from "../../src/sync/scheduleTrailingPublish.js"
import { testEnv } from "../helpers/test-env.js"

describe("scheduleTrailingPublish", () => {
    const projectId = "trailing-publish-project"

    beforeEach(async () => {
        await applyD1Migrations(env.DB, env.TEST_MIGRATIONS)
        await env.DB.prepare(
            `INSERT INTO customers (id, email, subscription_status, plan_id) VALUES (?, ?, 'active', 'paid')`
        )
            .bind("cust-1", "trailing@example.com")
            .run()
        await env.DB.prepare(
            `INSERT INTO projects (
                id, customer_id, framer_project_url, framer_collection_id, framer_collection_name,
                source_provider, source_data_source_id, slug_source_property_id,
                auto_sync, auto_publish, publish_mode, updated_at
            ) VALUES (?, ?, 'https://framer.com/p', 'col', 'Blog', 'notion', 'ds-1', 'title', 1, 1, 'deploy_live', datetime('now'))`
        )
            .bind(projectId, "cust-1")
            .run()
        await env.DB.prepare(`INSERT INTO sync_state (project_id) VALUES (?)`).bind(projectId).run()
    })

    afterEach(async () => {
        await reset()
    })

    it("queues a delayed publish job when publish is pending", async () => {
        const workerEnv = testEnv()
        const send = vi.fn().mockResolvedValue(undefined)
        workerEnv.SYNC_QUEUE = { send: send, sendBatch: vi.fn() } as typeof workerEnv.SYNC_QUEUE

        await markPublishPending(workerEnv, projectId)
        await scheduleTrailingPublish(workerEnv, projectId)

        expect(await getPublishPending(workerEnv, projectId)).toBe(true)
        expect(await getPublishScheduledAt(workerEnv, projectId)).not.toBeNull()
        expect(send).toHaveBeenCalledWith(
            { kind: "publish", projectId },
            expect.objectContaining({ delaySeconds: expect.any(Number) })
        )
    })

    it("does not queue when auto-publish is off", async () => {
        const workerEnv = testEnv()
        const send = vi.fn()
        workerEnv.SYNC_QUEUE = { send: send, sendBatch: vi.fn() } as typeof workerEnv.SYNC_QUEUE

        await env.DB.prepare(`UPDATE projects SET auto_publish = 0 WHERE id = ?`)
            .bind(projectId)
            .run()

        await markPublishPending(workerEnv, projectId)
        await scheduleTrailingPublish(workerEnv, projectId)

        expect(send).not.toHaveBeenCalled()
    })
})
