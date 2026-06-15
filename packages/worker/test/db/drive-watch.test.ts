import { applyD1Migrations, env, reset } from "cloudflare:test"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { encrypt } from "../../src/crypto.js"
import {
    getDriveWatchForProject,
    saveDriveWatchForProject,
    stageDriveWatchChannel,
} from "../../src/db/drive-watch.js"
import { createTestCustomer } from "../helpers/db-fixtures.js"
import { testEnv } from "../helpers/test-env.js"

async function seedSheetsProject(
    workerEnv: ReturnType<typeof testEnv>,
    customerId: string,
    opts: {
        spreadsheetId?: string
        channelId?: string
        channelToken?: string
        sourceTitle?: string
    } = {}
) {
    const projectId = crypto.randomUUID()
    const spreadsheetId = opts.spreadsheetId ?? "spreadsheet-abc"
    const channelId = opts.channelId ?? crypto.randomUUID()
    const channelToken = opts.channelToken ?? crypto.randomUUID()
    const sourceTitle = opts.sourceTitle ?? "My Sheet"

    const tokenEnc = await encrypt(workerEnv.ENCRYPTION_KEY, "google-refresh-token")
    const framerEnc = await encrypt(workerEnv.ENCRYPTION_KEY, "test-api-key-12345678")

    await workerEnv.DB.batch([
        workerEnv.DB.prepare(
            `INSERT INTO projects (
                id, customer_id, framer_project_url, framer_collection_id, framer_collection_name,
                framer_sync_mode, source_provider, source_data_source_id, source_database_id, source_title,
                slug_source_property_id, auto_sync, auto_publish, publish_mode, updated_at
            ) VALUES (?, ?, 'https://framer.com/projects/test', 'col', 'Blog', 'managed', 'google_sheets', ?, '0', ?, 'col_0', 1, 0, 'deploy_live', datetime('now'))`
        ).bind(projectId, customerId, spreadsheetId, sourceTitle),
        workerEnv.DB.prepare(
            `INSERT INTO secrets (project_id, source_access_token_enc, framer_api_key_enc, source_webhook_verification_token)
             VALUES (?, ?, ?, ?)`
        ).bind(projectId, tokenEnc, framerEnc, channelToken),
        workerEnv.DB.prepare(
            `INSERT INTO webhook_subscriptions (project_id, source_subscription_id, status)
             VALUES (?, ?, 'pending')`
        ).bind(projectId, channelId),
        workerEnv.DB.prepare(`INSERT INTO sync_state (project_id) VALUES (?)`).bind(projectId),
    ])

    return { projectId, spreadsheetId, channelId, channelToken, sourceTitle }
}

describe("drive watch storage", () => {
    beforeEach(async () => {
        await applyD1Migrations(env.DB, env.TEST_MIGRATIONS)
    })

    afterEach(async () => {
        await reset()
    })

    it("stages channel credentials before Google registers the watch", async () => {
        const customer = await createTestCustomer(testEnv(), "drive-watch@example.com", {
            planId: "paid",
        })
        const seeded = await seedSheetsProject(testEnv(), customer.id)
        const staged = {
            channelId: crypto.randomUUID(),
            channelToken: crypto.randomUUID(),
            expiresAt: new Date(Date.now() + 60_000).toISOString(),
        }

        await stageDriveWatchChannel(testEnv(), seeded.projectId, staged)

        const row = await getDriveWatchForProject(testEnv(), seeded.projectId)
        expect(row?.channelId).toBe(staged.channelId)
        expect(row?.status).toBe("pending")

        const secret = await testEnv()
            .DB.prepare(
                `SELECT source_webhook_verification_token FROM secrets WHERE project_id = ?`
            )
            .bind(seeded.projectId)
            .first<{ source_webhook_verification_token: string }>()
        expect(secret?.source_webhook_verification_token).toBe(staged.channelToken)
    })

    it("activates watch after Google returns resource metadata", async () => {
        const customer = await createTestCustomer(testEnv(), "drive-active@example.com", {
            planId: "paid",
        })
        const seeded = await seedSheetsProject(testEnv(), customer.id)

        await saveDriveWatchForProject(testEnv(), seeded.projectId, {
            channelId: seeded.channelId,
            channelToken: seeded.channelToken,
            resourceId: "resource-xyz",
            expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
        })

        const row = await getDriveWatchForProject(testEnv(), seeded.projectId)
        expect(row).toMatchObject({
            channelId: seeded.channelId,
            resourceId: "resource-xyz",
            status: "active",
        })
    })
})
