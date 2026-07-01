import { applyD1Migrations, env, reset } from "cloudflare:test"
import { PENDING_FRAMER_COLLECTION_ID } from "@knotcms/shared"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { getProject } from "../../src/db.js"
import { createOrUpdateProject } from "../../src/db/projects.js"
import { createSetupSession, saveSetupSessionToken } from "../../src/db/sessions.js"
import * as verifyFramerCredentialsModule from "../../src/sync/verifyFramerCredentials.js"
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

describe("createOrUpdateProject user collection", () => {
    beforeEach(async () => {
        await applyD1Migrations(env.DB, env.TEST_MIGRATIONS)
        vi.spyOn(verifyFramerCredentialsModule, "verifyFramerCredentials").mockImplementation(
            async (projectUrl: string, apiKey: string) => ({
                projectUrl: projectUrl.replace(/\/$/, ""),
                apiKey: apiKey.trim(),
            })
        )
    })

    afterEach(async () => {
        vi.clearAllMocks()
        await reset()
    })

    it("allows pending collection id for new user-collection projects", async () => {
        const workerEnv = testEnv()
        const customer = await createTestCustomer(workerEnv, "create-user@example.com", {
            planId: "paid",
        })
        const setupSessionId = await createSetupSession(workerEnv, customer.id)
        await saveSetupSessionToken(workerEnv, setupSessionId, customer.id, "notion-token-test")

        const projectId = await createOrUpdateProject(
            workerEnv,
            {
                setupSessionId,
                framerProjectUrl: "https://framer.com/projects/test-user-create",
                framerApiKey: "test-api-key-12345678",
                framerSyncMode: "user",
                framerCollectionId: PENDING_FRAMER_COLLECTION_ID,
                framerCollectionName: "Blog",
                framerTemplateCollectionId: "col_template",
                notionDataSourceId: "ds-blog",
                notionDatabaseId: "db-blog",
                notionDataSourceTitle: "Blog",
                slugNotionPropertyId: "title",
                autoSync: true,
                autoPublish: true,
                publishMode: "deploy_live",
                fieldMappings: [sampleMapping],
            },
            { customerId: customer.id }
        )

        const project = await getProject(workerEnv, projectId)
        expect(project).toMatchObject({
            framer_sync_mode: "user",
            framer_collection_id: PENDING_FRAMER_COLLECTION_ID,
            framer_collection_name: "Blog",
            framer_template_collection_id: "col_template",
        })
    })

    it("rejects pending collection id for in-place managed sync", async () => {
        const workerEnv = testEnv()
        const customer = await createTestCustomer(workerEnv, "invalid-managed@example.com", {
            planId: "paid",
        })
        const setupSessionId = await createSetupSession(workerEnv, customer.id)
        await saveSetupSessionToken(workerEnv, setupSessionId, customer.id, "notion-token-test")

        await expect(
            createOrUpdateProject(
                workerEnv,
                {
                    setupSessionId,
                    framerProjectUrl: "https://framer.com/projects/test-managed-invalid",
                    framerApiKey: "test-api-key-12345678",
                    framerSyncMode: "managed_in_place",
                    framerCollectionId: PENDING_FRAMER_COLLECTION_ID,
                    framerCollectionName: "Blog",
                    notionDataSourceId: "ds-invalid",
                    slugNotionPropertyId: "title",
                    autoSync: true,
                    autoPublish: true,
                    publishMode: "deploy_live",
                    fieldMappings: [sampleMapping],
                },
                { customerId: customer.id }
            )
        ).rejects.toThrow(/collection id is required/)
    })

    it("still uses the KnotCMS suffix for legacy managed projects", async () => {
        const workerEnv = testEnv()
        const customer = await createTestCustomer(workerEnv, "create-managed@example.com", {
            planId: "paid",
        })
        const setupSessionId = await createSetupSession(workerEnv, customer.id)
        await saveSetupSessionToken(workerEnv, setupSessionId, customer.id, "notion-token-test")

        const projectId = await createOrUpdateProject(
            workerEnv,
            {
                setupSessionId,
                framerProjectUrl: "https://framer.com/projects/test-managed-create",
                framerApiKey: "test-api-key-12345678",
                framerSyncMode: "managed",
                notionDataSourceId: "ds-managed",
                notionDataSourceTitle: "Blog",
                slugNotionPropertyId: "title",
                autoSync: true,
                autoPublish: true,
                publishMode: "deploy_live",
                fieldMappings: [sampleMapping],
            },
            { customerId: customer.id }
        )

        const project = await getProject(workerEnv, projectId)
        expect(project?.framer_collection_name).toBe("Blog · KnotCMS")
        expect(project?.framer_sync_mode).toBe("managed")
    })
})
