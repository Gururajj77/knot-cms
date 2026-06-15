import { applyD1Migrations, env, reset } from "cloudflare:test"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { encrypt } from "../../src/crypto.js"
import { handleGoogleDriveWebhook } from "../../src/webhooks/google-drive.js"
import { createTestCustomer } from "../helpers/db-fixtures.js"
import { testEnv } from "../helpers/test-env.js"

async function seedSheetsWatch(
    workerEnv: ReturnType<typeof testEnv>,
    customerId: string,
    opts: {
        channelId?: string
        channelToken?: string
        resourceId?: string
        spreadsheetId?: string
        watchExpiresAt?: string
        watchStatus?: string
    } = {}
) {
    const projectId = crypto.randomUUID()
    const channelId = opts.channelId ?? crypto.randomUUID()
    const channelToken = opts.channelToken ?? crypto.randomUUID()
    const resourceId = opts.resourceId ?? "drive-resource-1"
    const spreadsheetId = opts.spreadsheetId ?? "spreadsheet-abc"
    const watchExpiresAt =
        opts.watchExpiresAt ?? new Date(Date.now() + 86_400_000).toISOString()
    const watchStatus = opts.watchStatus ?? "active"

    const tokenEnc = await encrypt(workerEnv.ENCRYPTION_KEY, "google-refresh-token")
    const framerEnc = await encrypt(workerEnv.ENCRYPTION_KEY, "test-api-key-12345678")

    await workerEnv.DB.batch([
        workerEnv.DB.prepare(
            `INSERT INTO projects (
                id, customer_id, framer_project_url, framer_collection_id, framer_collection_name,
                framer_sync_mode, source_provider, source_data_source_id, source_database_id, source_title,
                slug_source_property_id, auto_sync, auto_publish, publish_mode, updated_at
            ) VALUES (?, ?, 'https://framer.com/projects/test', 'col', 'Blog', 'managed', 'google_sheets', ?, '0', 'Sheet', 'col_0', 1, 0, 'deploy_live', datetime('now'))`
        ).bind(projectId, customerId, spreadsheetId),
        workerEnv.DB.prepare(
            `INSERT INTO secrets (project_id, source_access_token_enc, framer_api_key_enc, source_webhook_verification_token)
             VALUES (?, ?, ?, ?)`
        ).bind(projectId, tokenEnc, framerEnc, channelToken),
        workerEnv.DB.prepare(
            `INSERT INTO webhook_subscriptions (project_id, source_subscription_id, watch_resource_id, watch_expires_at, status)
             VALUES (?, ?, ?, ?, ?)`
        ).bind(projectId, channelId, resourceId, watchExpiresAt, watchStatus),
        workerEnv.DB.prepare(`INSERT INTO sync_state (project_id) VALUES (?)`).bind(projectId),
    ])

    return { projectId, channelId, channelToken, resourceId, spreadsheetId }
}

function driveHeaders(input: {
    channelId: string
    channelToken: string
    resourceState?: string
    resourceId?: string
}): Headers {
    const headers = new Headers()
    headers.set("X-Goog-Channel-ID", input.channelId)
    headers.set("X-Goog-Channel-Token", input.channelToken)
    headers.set("X-Goog-Resource-State", input.resourceState ?? "change")
    if (input.resourceId) {
        headers.set("X-Goog-Resource-ID", input.resourceId)
    }
    return headers
}

describe("handleGoogleDriveWebhook", () => {
    beforeEach(async () => {
        await applyD1Migrations(env.DB, env.TEST_MIGRATIONS)
    })

    afterEach(async () => {
        await reset()
    })

    it("returns 401 when channel token does not match", async () => {
        const customer = await createTestCustomer(testEnv(), "drive-401@example.com", {
            planId: "paid",
        })
        const seeded = await seedSheetsWatch(testEnv(), customer.id)

        const { response, projectIdsToSync } = await handleGoogleDriveWebhook(
            testEnv(),
            driveHeaders({
                channelId: seeded.channelId,
                channelToken: "wrong-token",
                resourceState: "sync",
            })
        )

        expect(response.status).toBe(401)
        expect(projectIdsToSync).toEqual([])
    })

    it("accepts Google's sync verification ping without enqueueing", async () => {
        const customer = await createTestCustomer(testEnv(), "drive-sync@example.com", {
            planId: "paid",
        })
        const seeded = await seedSheetsWatch(testEnv(), customer.id)

        const { response, projectIdsToSync } = await handleGoogleDriveWebhook(
            testEnv(),
            driveHeaders({
                channelId: seeded.channelId,
                channelToken: seeded.channelToken,
                resourceState: "sync",
                resourceId: seeded.resourceId,
            })
        )

        expect(response.status).toBe(200)
        expect(projectIdsToSync).toEqual([])
    })

    it("accepts staged credentials on the sync ping (pre-activation race)", async () => {
        const customer = await createTestCustomer(testEnv(), "drive-staged@example.com", {
            planId: "paid",
        })
        const seeded = await seedSheetsWatch(testEnv(), customer.id)
        const stagedChannelId = crypto.randomUUID()
        const stagedToken = crypto.randomUUID()

        await testEnv()
            .DB.prepare(
                `UPDATE secrets SET source_webhook_verification_token = ? WHERE project_id = ?`
            )
            .bind(stagedToken, seeded.projectId)
            .run()
        await testEnv()
            .DB.prepare(
                `UPDATE webhook_subscriptions SET source_subscription_id = ?, status = 'pending' WHERE project_id = ?`
            )
            .bind(stagedChannelId, seeded.projectId)
            .run()

        const { response, projectIdsToSync } = await handleGoogleDriveWebhook(
            testEnv(),
            driveHeaders({
                channelId: stagedChannelId,
                channelToken: stagedToken,
                resourceState: "sync",
            })
        )

        expect(response.status).toBe(200)
        expect(projectIdsToSync).toEqual([])
    })

    it("enqueues sheet projects on change notifications", async () => {
        const customer = await createTestCustomer(testEnv(), "drive-change@example.com", {
            planId: "paid",
        })
        const seeded = await seedSheetsWatch(testEnv(), customer.id)

        const { response, projectIdsToSync } = await handleGoogleDriveWebhook(
            testEnv(),
            driveHeaders({
                channelId: seeded.channelId,
                channelToken: seeded.channelToken,
                resourceState: "change",
                resourceId: seeded.resourceId,
            })
        )

        expect(response.status).toBe(200)
        expect(projectIdsToSync).toEqual([seeded.projectId])
    })
})
