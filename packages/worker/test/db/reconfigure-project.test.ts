import { applyD1Migrations, env, reset } from "cloudflare:test"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { encrypt } from "../../src/crypto.js"
import { getProjectMappings } from "../../src/db/mappings.js"
import { replaceFieldMappings } from "../../src/db/mappings.js"
import {
    getReconfigureProjectContext,
    reconfigureProject,
    ReconfigureProjectConflictError,
} from "../../src/db/projects.js"
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

async function seedProject(
    env: ReturnType<typeof testEnv>,
    customerId: string,
    opts: { notionDataSourceId?: string; framerProjectUrl?: string } = {}
) {
    const projectId = crypto.randomUUID()
    const suffix = projectId.slice(0, 8)
    const framerProjectUrl = opts.framerProjectUrl ?? `https://framer.com/projects/${suffix}`
    const notionDataSourceId = opts.notionDataSourceId ?? `ds-${suffix}`

    const setupSessionId = await createSetupSession(env)
    await saveSetupSessionToken(env, setupSessionId, "notion-token-test")

    const notionEnc = await encrypt(env.ENCRYPTION_KEY, "notion-token-test")
    const framerEnc = await encrypt(env.ENCRYPTION_KEY, "test-api-key-12345678")

    await env.DB.batch([
        env.DB.prepare(
            `INSERT INTO projects (
                id, customer_id, framer_project_url, framer_collection_id, framer_collection_name,
                framer_sync_mode, source_provider, source_data_source_id, source_title,
                slug_source_property_id, auto_sync, auto_publish, publish_mode, updated_at
            ) VALUES (?, ?, ?, 'col', 'Blog', 'managed', 'notion', ?, 'Blog', 'title', 1, 1, 'deploy_live', datetime('now'))`
        ).bind(projectId, customerId, framerProjectUrl, notionDataSourceId),
        env.DB.prepare(
            `INSERT INTO secrets (project_id, source_access_token_enc, framer_api_key_enc)
             VALUES (?, ?, ?)`
        ).bind(projectId, notionEnc, framerEnc),
    ])

    await replaceFieldMappings(env, projectId, [sampleMapping])

    return { projectId, setupSessionId, framerProjectUrl, notionDataSourceId }
}

describe("reconfigureProject", () => {
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

    it("returns current connection context for the project owner", async () => {
        const customer = await createTestCustomer(testEnv(), "reconfigure@example.com", {
            planId: "paid",
        })
        const seeded = await seedProject(testEnv(), customer.id)

        const context = await getReconfigureProjectContext(testEnv(), seeded.projectId, customer.id)
        expect(context).toMatchObject({
            projectId: seeded.projectId,
            notionDataSourceId: seeded.notionDataSourceId,
            framerProjectUrl: seeded.framerProjectUrl,
        })
        expect(context?.fieldMappings).toHaveLength(1)
    })

    it("updates notion source and mappings on the same project", async () => {
        const customer = await createTestCustomer(testEnv(), "update@example.com", { planId: "paid" })
        const seeded = await seedProject(testEnv(), customer.id)

        await reconfigureProject(testEnv(), seeded.projectId, customer.id, {
            setupSessionId: seeded.setupSessionId,
            framerApiKey: "test-api-key-12345678",
            notionDataSourceId: "ds_new",
            notionDatabaseId: "db_new",
            notionDataSourceTitle: "New Blog",
            slugNotionPropertyId: "title",
            autoSync: true,
            autoPublish: false,
            publishMode: "preview_only",
            fieldMappings: [{ ...sampleMapping, framerFieldName: "Headline" }],
            preserveUnlinkedFramerRows: false,
        })

        const context = await getReconfigureProjectContext(testEnv(), seeded.projectId, customer.id)
        expect(context?.notionDataSourceId).toBe("ds_new")
        expect(context?.notionDataSourceTitle).toBe("New Blog")
        expect(context?.autoPublish).toBe(false)

        const mappings = await getProjectMappings(testEnv(), seeded.projectId)
        expect(mappings[0]?.framerFieldName).toBe("Headline")
    })

    it("rejects linking a notion database already used by another project", async () => {
        const customer = await createTestCustomer(testEnv(), "conflict@example.com", {
            planId: "paid",
            subscriptionProjectLimit: 5,
        })
        const first = await seedProject(testEnv(), customer.id, { notionDataSourceId: "ds_taken" })
        const second = await seedProject(testEnv(), customer.id, {
            notionDataSourceId: "ds_other",
            framerProjectUrl: first.framerProjectUrl,
        })

        await expect(
            reconfigureProject(testEnv(), second.projectId, customer.id, {
                setupSessionId: second.setupSessionId,
                framerApiKey: "test-api-key-12345678",
                notionDataSourceId: "ds_taken",
                slugNotionPropertyId: "title",
                autoSync: true,
                autoPublish: true,
                publishMode: "deploy_live",
                fieldMappings: [sampleMapping],
                preserveUnlinkedFramerRows: false,
            })
        ).rejects.toBeInstanceOf(ReconfigureProjectConflictError)
    })
})
