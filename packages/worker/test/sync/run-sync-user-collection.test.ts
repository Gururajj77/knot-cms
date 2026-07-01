import { applyD1Migrations, env, reset } from "cloudflare:test"
import { PENDING_FRAMER_COLLECTION_ID } from "@knotcms/shared"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { encrypt } from "../../src/crypto.js"
import { getProject } from "../../src/db.js"
import { replaceFieldMappings } from "../../src/db/mappings.js"
import * as buildPayloadModule from "../../src/sync/buildPayload.js"
import * as framerApiModule from "framer-api"
import { runSync } from "../../src/sync/runSync.js"
import type { Env } from "../../src/env.js"
import { createTestCustomer } from "../helpers/db-fixtures.js"
import { testEnv } from "../helpers/test-env.js"

const sampleMapping = {
    notionPropertyId: "title",
    notionPropertyName: "Title",
    notionPropertyType: "title",
    framerFieldId: "title",
    framerFieldName: "Name",
    framerFieldType: "string" as const,
}

const syncItems = [
    {
        id: "page-1",
        slug: "hello",
        draft: false,
        fieldData: {
            title: { type: "string", value: "Hello" },
        },
    },
]

function withMockSyncQueue(workerEnv: Env) {
    workerEnv.SYNC_QUEUE = {
        send: vi.fn().mockResolvedValue(undefined),
        sendBatch: vi.fn().mockResolvedValue(undefined),
        metrics: { queueName: "sync-jobs" },
    } as unknown as Env["SYNC_QUEUE"]
    return workerEnv
}

async function seedPendingUserProject(workerEnv: Env, customerId: string) {
    const projectId = crypto.randomUUID()
    const suffix = projectId.slice(0, 8)
    const notionEnc = await encrypt(workerEnv.ENCRYPTION_KEY, "notion-token-test")
    const framerEnc = await encrypt(workerEnv.ENCRYPTION_KEY, "test-api-key-12345678")

    await workerEnv.DB.batch([
        workerEnv.DB.prepare(
            `INSERT INTO projects (
                id, customer_id, framer_project_url, framer_collection_id, framer_collection_name,
                framer_template_collection_id, framer_sync_mode, source_provider, source_data_source_id,
                source_title, slug_source_property_id, auto_sync, auto_publish, publish_mode, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, 'user', 'notion', ?, 'Blog', 'title', 1, 0, 'preview_only', datetime('now'))`
        ).bind(
            projectId,
            customerId,
            `https://framer.com/projects/${suffix}`,
            PENDING_FRAMER_COLLECTION_ID,
            "Blog",
            "col_template",
            `ds-${suffix}`
        ),
        workerEnv.DB.prepare(
            `INSERT INTO secrets (project_id, source_access_token_enc, framer_api_key_enc)
             VALUES (?, ?, ?)`
        ).bind(projectId, notionEnc, framerEnc),
        workerEnv.DB.prepare(`INSERT INTO sync_state (project_id) VALUES (?)`).bind(projectId),
    ])

    await replaceFieldMappings(workerEnv, projectId, [sampleMapping])

    return projectId
}

describe("runSync pending user collection", () => {
    beforeEach(async () => {
        await applyD1Migrations(env.DB, env.TEST_MIGRATIONS)
        vi.useFakeTimers()
    })

    afterEach(async () => {
        vi.restoreAllMocks()
        vi.useRealTimers()
        await reset()
    })

    it("creates a user collection, seeds fields, and syncs rows on first sync", async () => {
        const workerEnv = withMockSyncQueue(testEnv())
        const customer = await createTestCustomer(workerEnv, "user-create@example.com", {
            planId: "paid",
        })
        const projectId = await seedPendingUserProject(workerEnv, customer.id)

        const collection = {
            id: "col_new",
            name: "Blog",
            managedBy: "user",
            getFields: vi
                .fn()
                .mockResolvedValueOnce([])
                .mockResolvedValue([{ id: "f_title", name: "Name", type: "string" }]),
            addFields: vi.fn().mockResolvedValue([{ id: "f_title", name: "Name", type: "string" }]),
            getItems: vi.fn().mockResolvedValue([]),
            addItems: vi.fn().mockResolvedValue(undefined),
            removeItems: vi.fn().mockResolvedValue(undefined),
        }

        const framer = {
            getCollections: vi
                .fn()
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([])
                .mockResolvedValue([collection]),
            createCollection: vi.fn().mockResolvedValue(collection),
            getCollection: vi.fn().mockResolvedValue(collection),
            publish: vi.fn(),
            deploy: vi.fn(),
            [Symbol.dispose]: vi.fn(),
        }

        vi.spyOn(framerApiModule, "connect").mockResolvedValue(
            framer as unknown as Awaited<ReturnType<typeof framerApiModule.connect>>
        )

        const project = await getProject(workerEnv, projectId)
        vi.spyOn(buildPayloadModule, "buildProjectSyncPayload").mockResolvedValue({
            project: project!,
            payload: { fields: [], items: syncItems },
            mappings: [sampleMapping],
        })

        const syncPromise = runSync(workerEnv, projectId)
        await vi.runAllTimersAsync()
        const result = await syncPromise

        expect(framer.createCollection).toHaveBeenCalledWith("Blog")
        expect(collection.addFields).toHaveBeenCalledWith([{ type: "string", name: "Name" }])
        expect(collection.addItems).toHaveBeenCalled()
        expect(result.itemsSynced).toBe(1)

        const updated = await getProject(workerEnv, projectId)
        expect(updated?.framer_collection_id).toBe("col_new")
        expect(updated?.framer_collection_name).toBe("Blog")
    })

    it("reuses an existing user collection on later syncs", async () => {
        const workerEnv = withMockSyncQueue(testEnv())
        const customer = await createTestCustomer(workerEnv, "user-reuse@example.com", {
            planId: "paid",
        })
        const projectId = await seedPendingUserProject(workerEnv, customer.id)

        await workerEnv.DB.prepare(
            `UPDATE projects SET framer_collection_id = ?, framer_sync_mode = 'user' WHERE id = ?`
        )
            .bind("col_existing", projectId)
            .run()

        const collection = {
            id: "col_existing",
            name: "Blog",
            managedBy: "user",
            getFields: vi.fn().mockResolvedValue([{ id: "f_title", name: "Name", type: "string" }]),
            addFields: vi.fn(),
            getItems: vi.fn().mockResolvedValue([]),
            addItems: vi.fn().mockResolvedValue(undefined),
            removeItems: vi.fn().mockResolvedValue(undefined),
        }

        const framer = {
            getCollections: vi.fn().mockResolvedValue([collection]),
            createCollection: vi.fn(),
            getCollection: vi.fn().mockResolvedValue(collection),
            publish: vi.fn(),
            deploy: vi.fn(),
            [Symbol.dispose]: vi.fn(),
        }

        vi.spyOn(framerApiModule, "connect").mockResolvedValue(
            framer as unknown as Awaited<ReturnType<typeof framerApiModule.connect>>
        )

        const project = await getProject(workerEnv, projectId)
        vi.spyOn(buildPayloadModule, "buildProjectSyncPayload").mockResolvedValue({
            project: project!,
            payload: { fields: [], items: syncItems },
            mappings: [sampleMapping],
        })

        await runSync(workerEnv, projectId)

        expect(framer.createCollection).not.toHaveBeenCalled()
        expect(collection.addFields).not.toHaveBeenCalled()
        expect(collection.addItems).toHaveBeenCalled()
    })
})
