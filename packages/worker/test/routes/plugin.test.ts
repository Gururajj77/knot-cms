import { SELF, applyD1Migrations, env, reset } from "cloudflare:test"
import { afterEach, describe, expect, it } from "vitest"
import { createTestCustomer } from "../helpers/db-fixtures.js"
import { testEnv } from "../helpers/test-env.js"

async function insertPluginTestProject(
    envBindings: ReturnType<typeof testEnv>,
    opts: {
        projectId: string
        customerId: string
        framerProjectUrl: string
        sourceTitle: string
        framerCollectionName: string
        notionDataSourceId: string
    }
) {
    await envBindings.DB.prepare(
        `INSERT INTO projects (
            id, customer_id, framer_project_url, framer_collection_id, framer_collection_name,
            source_provider, source_data_source_id, source_title, slug_source_property_id,
            auto_sync, auto_publish, publish_mode, updated_at
        ) VALUES (?, ?, ?, 'col_blog', ?, 'notion', ?, ?, 'slug', 1, 0, 'deploy_live', datetime('now'))`
    )
        .bind(
            opts.projectId,
            opts.customerId,
            opts.framerProjectUrl,
            opts.framerCollectionName,
            opts.notionDataSourceId,
            opts.sourceTitle
        )
        .run()
}

describe("GET /api/plugin/projects", () => {
    afterEach(async () => {
        await reset()
        await applyD1Migrations(env.DB, env.TEST_MIGRATIONS)
    })

    it("returns connected projects for a Framer site URL", async () => {
        const customer = await createTestCustomer(testEnv(), "plugin-site@example.com")
        const editorId = "abc123site"
        const framerProjectUrl = `https://framer.com/projects/${editorId}`

        await insertPluginTestProject(testEnv(), {
            customerId: customer.id,
            projectId: "proj_plugin_1",
            framerProjectUrl,
            notionDataSourceId: "ds_1",
            sourceTitle: "Blog posts",
            framerCollectionName: "Blog",
        })

        const response = await SELF.fetch(
            `http://localhost/api/plugin/projects?framerProjectUrl=${encodeURIComponent(framerProjectUrl)}`
        )

        expect(response.status).toBe(200)
        const body = (await response.json()) as {
            connected: boolean
            projects: Array<{ id: string; sourceTitle: string | null }>
        }
        expect(body.connected).toBe(true)
        expect(body.projects).toHaveLength(1)
        expect(body.projects[0]?.id).toBe("proj_plugin_1")
        expect(body.projects[0]?.sourceTitle).toBe("Blog posts")
    })

    it("returns not connected when no projects match", async () => {
        const response = await SELF.fetch(
            "http://localhost/api/plugin/projects?framerProjectUrl=https%3A%2F%2Fframer.com%2Fprojects%2Fmissing"
        )

        expect(response.status).toBe(200)
        const body = (await response.json()) as { connected: boolean; projects: unknown[] }
        expect(body.connected).toBe(false)
        expect(body.projects).toEqual([])
    })

    it("rejects invalid Framer project URLs", async () => {
        const response = await SELF.fetch(
            "http://localhost/api/plugin/projects?framerProjectUrl=https%3A%2F%2Fevil.com%2Fprojects%2Fx"
        )

        expect(response.status).toBe(400)
    })
})
