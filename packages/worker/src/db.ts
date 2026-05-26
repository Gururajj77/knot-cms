import type {
    CreateProjectInput,
    FieldMapping,
    ProjectStatus,
    PublishMode,
    UpdatePublishSettingsInput,
} from "@notion-framer/shared"
import { decrypt, encrypt } from "./crypto.js"
import type { Env } from "./env.js"

export interface ProjectRow {
    id: string
    framer_project_url: string
    framer_collection_id: string
    framer_collection_name: string | null
    notion_data_source_id: string
    notion_database_id: string | null
    notion_data_source_title: string | null
    slug_notion_property_id: string
    auto_sync: number
    auto_publish: number
    publish_mode: string
    license_key_hash: string | null
    license_status: string
}

export interface FieldMappingRow {
    notion_property_id: string
    notion_property_name: string
    notion_property_type: string
    framer_field_id: string
    framer_field_name: string
    framer_field_type: string
    ignored: number
    transform_json: string | null
}

export async function createSetupSession(env: Env): Promise<string> {
    const id = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
    await env.DB.prepare(
        `INSERT INTO setup_sessions (id, expires_at) VALUES (?, ?)`
    )
        .bind(id, expiresAt)
        .run()
    return id
}

export async function saveSetupSessionToken(
    env: Env,
    sessionId: string,
    notionToken: string
): Promise<void> {
    const enc = await encrypt(env.ENCRYPTION_KEY, notionToken)
    await env.DB.prepare(
        `UPDATE setup_sessions SET notion_access_token_enc = ? WHERE id = ? AND datetime(expires_at) > datetime('now')`
    )
        .bind(enc, sessionId)
        .run()
}

export async function getSetupSessionToken(env: Env, sessionId: string): Promise<string | null> {
    const row = await env.DB.prepare(
        `SELECT notion_access_token_enc FROM setup_sessions WHERE id = ? AND datetime(expires_at) > datetime('now')`
    )
        .bind(sessionId)
        .first<{ notion_access_token_enc: string | null }>()

    if (!row?.notion_access_token_enc) return null
    return decrypt(env.ENCRYPTION_KEY, row.notion_access_token_enc)
}

export function rowToFieldMapping(row: FieldMappingRow): FieldMapping {
    const transform = row.transform_json ? (JSON.parse(row.transform_json) as Record<string, unknown>) : {}
    return {
        notionPropertyId: row.notion_property_id,
        notionPropertyName: row.notion_property_name || row.notion_property_id,
        notionPropertyType: row.notion_property_type,
        framerFieldId: row.framer_field_id,
        framerFieldName: row.framer_field_name,
        framerFieldType: row.framer_field_type as FieldMapping["framerFieldType"],
        ignored: row.ignored === 1,
        enumCaseMap: transform.enumCaseMap as FieldMapping["enumCaseMap"],
        contentType: transform.contentType as FieldMapping["contentType"],
    }
}

export async function getProject(env: Env, projectId: string): Promise<ProjectRow | null> {
    return env.DB.prepare(`SELECT * FROM projects WHERE id = ?`)
        .bind(projectId)
        .first<ProjectRow>()
}

export async function getProjectMappings(env: Env, projectId: string): Promise<FieldMapping[]> {
    const rows = await env.DB.prepare(`SELECT * FROM field_mappings WHERE project_id = ?`)
        .bind(projectId)
        .all<FieldMappingRow>()
    return (rows.results ?? []).map(rowToFieldMapping)
}

export async function getProjectSecrets(
    env: Env,
    projectId: string
): Promise<{ notionToken: string; framerApiKey: string; webhookToken: string | null } | null> {
    const row = await env.DB.prepare(`SELECT * FROM secrets WHERE project_id = ?`)
        .bind(projectId)
        .first<{
            notion_access_token_enc: string
            framer_api_key_enc: string
            notion_webhook_verification_token: string | null
        }>()

    if (!row) return null

    return {
        notionToken: await decrypt(env.ENCRYPTION_KEY, row.notion_access_token_enc),
        framerApiKey: await decrypt(env.ENCRYPTION_KEY, row.framer_api_key_enc),
        webhookToken: row.notion_webhook_verification_token,
    }
}

export async function findProjectByFramerAndNotionSource(
    env: Env,
    framerProjectUrl: string,
    notionDataSourceId: string
): Promise<ProjectRow | null> {
    return env.DB.prepare(
        `SELECT * FROM projects WHERE framer_project_url = ? AND notion_data_source_id = ?`
    )
        .bind(framerProjectUrl.trim(), notionDataSourceId)
        .first<ProjectRow>()
}

async function replaceFieldMappings(
    env: Env,
    projectId: string,
    mappings: FieldMapping[]
): Promise<void> {
    await env.DB.prepare(`DELETE FROM field_mappings WHERE project_id = ?`).bind(projectId).run()
    for (const m of mappings) {
        const transformJson = JSON.stringify({
            enumCaseMap: m.enumCaseMap,
            contentType: m.contentType,
        })
        await env.DB.prepare(
            `INSERT INTO field_mappings (
        project_id, notion_property_id, notion_property_name, notion_property_type,
        framer_field_id, framer_field_name, framer_field_type, ignored, transform_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
            .bind(
                projectId,
                m.notionPropertyId,
                m.notionPropertyName,
                m.notionPropertyType,
                m.framerFieldId,
                m.framerFieldName,
                m.framerFieldType,
                m.ignored ? 1 : 0,
                transformJson
            )
            .run()
    }
}

/** Create or update project; safe to retry after sync failure without reconnecting Notion. */
export async function createOrUpdateProject(env: Env, input: CreateProjectInput): Promise<string> {
    const existing = await findProjectByFramerAndNotionSource(
        env,
        input.framerProjectUrl,
        input.notionDataSourceId
    )
    const notionToken = await getSetupSessionToken(env, input.setupSessionId)
    const framerEnc = await encrypt(env.ENCRYPTION_KEY, input.framerApiKey)
    const licenseHash = await hashLicenseKey(input.licenseKey)

    if (existing) {
        const collectionName = input.notionDataSourceTitle?.trim() || "Notion Sync"
        await env.DB.prepare(
            `UPDATE projects SET
        framer_project_url = ?, notion_data_source_id = ?, notion_database_id = ?,
        notion_data_source_title = ?, framer_collection_name = ?, slug_notion_property_id = ?,
        auto_sync = ?, auto_publish = ?, publish_mode = ?, license_key_hash = ?,
        license_status = 'active', updated_at = datetime('now')
       WHERE id = ?`
        )
            .bind(
                input.framerProjectUrl.trim(),
                input.notionDataSourceId,
                input.notionDatabaseId ?? null,
                input.notionDataSourceTitle ?? null,
                collectionName,
                input.slugNotionPropertyId,
                input.autoSync ? 1 : 0,
                input.autoPublish ? 1 : 0,
                input.publishMode,
                licenseHash,
                existing.id
            )
            .run()

        if (notionToken) {
            const notionEnc = await encrypt(env.ENCRYPTION_KEY, notionToken)
            await env.DB.prepare(
                `UPDATE secrets SET notion_access_token_enc = ?, framer_api_key_enc = ? WHERE project_id = ?`
            )
                .bind(notionEnc, framerEnc, existing.id)
                .run()
        } else {
            await env.DB.prepare(`UPDATE secrets SET framer_api_key_enc = ? WHERE project_id = ?`)
                .bind(framerEnc, existing.id)
                .run()
        }

        await replaceFieldMappings(env, existing.id, input.fieldMappings)
        return existing.id
    }

    if (!notionToken) {
        throw new Error(
            "Setup session expired. Click Connect Notion again, then retry — or open the plugin on this collection if it was already saved."
        )
    }

    const projectId = crypto.randomUUID()
    const notionEnc = await encrypt(env.ENCRYPTION_KEY, notionToken)
    const collectionName = input.notionDataSourceTitle?.trim() || "Notion Sync"

    await env.DB.batch([
        env.DB.prepare(
            `INSERT INTO projects (
        id, framer_project_url, framer_collection_id, framer_collection_name,
        notion_data_source_id, notion_data_source_title, slug_notion_property_id,
        auto_sync, auto_publish, publish_mode, license_status, license_key_hash, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, datetime('now'))`
        ).bind(
            projectId,
            input.framerProjectUrl.trim(),
            input.framerCollectionId ?? "pending",
            collectionName,
            input.notionDataSourceId,
            input.notionDataSourceTitle ?? null,
            input.slugNotionPropertyId,
            input.autoSync ? 1 : 0,
            input.autoPublish ? 1 : 0,
            input.publishMode,
            licenseHash
        ),
        env.DB.prepare(
            `INSERT INTO secrets (project_id, notion_access_token_enc, framer_api_key_enc)
       VALUES (?, ?, ?)`
        ).bind(projectId, notionEnc, framerEnc),
        env.DB.prepare(`INSERT INTO sync_state (project_id) VALUES (?)`).bind(projectId),
        env.DB.prepare(
            `INSERT INTO webhook_subscriptions (project_id, status) VALUES (?, 'pending')`
        ).bind(projectId),
    ])

    await replaceFieldMappings(env, projectId, input.fieldMappings)
    // Keep session until OAuth token is confirmed working; cleanup optional
    await env.DB.prepare(`DELETE FROM setup_sessions WHERE id = ?`).bind(input.setupSessionId).run()

    return projectId
}

async function hashLicenseKey(key: string): Promise<string> {
    const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key))
    return Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("")
}

export async function updateProjectPublishSettings(
    env: Env,
    projectId: string,
    settings: UpdatePublishSettingsInput
): Promise<ProjectStatus | null> {
    const project = await getProject(env, projectId)
    if (!project) return null

    const publishMode: PublishMode =
        settings.publishMode ??
        (settings.autoPublish ? "deploy_live" : (project.publish_mode as PublishMode))

    await env.DB.prepare(
        `UPDATE projects SET auto_publish = ?, publish_mode = ?, updated_at = datetime('now') WHERE id = ?`
    )
        .bind(settings.autoPublish ? 1 : 0, publishMode, projectId)
        .run()

    return getProjectStatus(env, projectId)
}

export async function updateProjectCollection(
    env: Env,
    projectId: string,
    collectionId: string,
    collectionName: string
): Promise<void> {
    await env.DB.prepare(
        `UPDATE projects SET framer_collection_id = ?, framer_collection_name = ?, updated_at = datetime('now') WHERE id = ?`
    )
        .bind(collectionId, collectionName, projectId)
        .run()
}

export async function updateSyncState(
    env: Env,
    projectId: string,
    update: { lastSyncAt?: string; lastError?: string | null; itemsSyncedCount?: number }
): Promise<void> {
    if (update.lastSyncAt !== undefined) {
        await env.DB.prepare(
            `UPDATE sync_state SET last_sync_at = ?, last_error = NULL, items_synced_count = COALESCE(?, items_synced_count)
       WHERE project_id = ?`
        )
            .bind(update.lastSyncAt, update.itemsSyncedCount ?? null, projectId)
            .run()
    }
    if (update.lastError !== undefined) {
        await env.DB.prepare(`UPDATE sync_state SET last_error = ? WHERE project_id = ?`)
            .bind(update.lastError, projectId)
            .run()
    }
}

export async function getProjectStatus(env: Env, projectId: string): Promise<ProjectStatus | null> {
    const project = await getProject(env, projectId)
    if (!project) return null

    const sync = await env.DB.prepare(`SELECT * FROM sync_state WHERE project_id = ?`)
        .bind(projectId)
        .first<{
            last_sync_at: string | null
            last_error: string | null
            items_synced_count: number
        }>()

    const webhook = await env.DB.prepare(`SELECT status FROM webhook_subscriptions WHERE project_id = ?`)
        .bind(projectId)
        .first<{ status: string }>()

    const secret = await env.DB.prepare(
        `SELECT notion_webhook_verification_token FROM secrets WHERE project_id = ?`
    )
        .bind(projectId)
        .first<{ notion_webhook_verification_token: string | null }>()

    return {
        id: project.id,
        framerProjectUrl: project.framer_project_url,
        framerCollectionName: project.framer_collection_name ?? project.notion_data_source_title,
        notionDataSourceTitle: project.notion_data_source_title,
        notionDataSourceId: project.notion_data_source_id,
        autoSync: project.auto_sync === 1,
        autoPublish: project.auto_publish === 1,
        publishMode: project.publish_mode as ProjectStatus["publishMode"],
        licenseStatus: project.license_status,
        lastSyncAt: sync?.last_sync_at ?? null,
        lastError: sync?.last_error ?? null,
        itemsSyncedCount: sync?.items_synced_count ?? 0,
        webhookStatus: webhook?.status ?? null,
        webhookVerificationToken: secret?.notion_webhook_verification_token ?? null,
    }
}

export async function setLicenseStatus(
    env: Env,
    projectId: string,
    status: string,
    licenseKeyHash?: string
): Promise<void> {
    if (licenseKeyHash) {
        await env.DB.prepare(
            `UPDATE projects SET license_status = ?, license_key_hash = ?, updated_at = datetime('now') WHERE id = ?`
        )
            .bind(status, licenseKeyHash, projectId)
            .run()
    } else {
        await env.DB.prepare(`UPDATE projects SET license_status = ?, updated_at = datetime('now') WHERE id = ?`)
            .bind(status, projectId)
            .run()
    }
}

export async function saveWebhookToken(
    env: Env,
    projectId: string,
    verificationToken: string
): Promise<void> {
    await env.DB.prepare(
        `UPDATE secrets SET notion_webhook_verification_token = ? WHERE project_id = ?`
    )
        .bind(verificationToken, projectId)
        .run()
}

/** Notion sends one verification_token per integration subscription — store on all projects. */
export async function saveIntegrationWebhookToken(
    env: Env,
    verificationToken: string
): Promise<void> {
    await env.DB.prepare(
        `UPDATE secrets SET notion_webhook_verification_token = ?`
    )
        .bind(verificationToken)
        .run()
}

export async function updateWebhookStatus(env: Env, projectId: string, status: string): Promise<void> {
    await env.DB.prepare(
        `UPDATE webhook_subscriptions SET status = ?, last_event_at = datetime('now') WHERE project_id = ?`
    )
        .bind(status, projectId)
        .run()
}

export async function findProjectsByNotionSource(
    env: Env,
    sourceId: string
): Promise<ProjectRow[]> {
    const result = await env.DB.prepare(
        `SELECT * FROM projects
     WHERE license_status = 'active'
       AND (notion_data_source_id = ? OR notion_database_id = ?)`
    )
        .bind(sourceId, sourceId)
        .all<ProjectRow>()
    return result.results ?? []
}

export async function scheduleDebounceSync(env: Env, projectId: string): Promise<void> {
    const scheduledAt = new Date(Date.now() + 45_000).toISOString()
    await env.DB.prepare(
        `INSERT INTO debounce_sync (project_id, scheduled_at) VALUES (?, ?)
     ON CONFLICT(project_id) DO UPDATE SET scheduled_at = excluded.scheduled_at`
    )
        .bind(projectId, scheduledAt)
        .run()
}

export async function getDueDebounceProjects(env: Env): Promise<string[]> {
    const result = await env.DB.prepare(
        `SELECT project_id FROM debounce_sync WHERE datetime(scheduled_at) <= datetime('now')`
    ).all<{ project_id: string }>()
    return (result.results ?? []).map(r => r.project_id)
}

export async function clearDebounce(env: Env, projectId: string): Promise<void> {
    await env.DB.prepare(`DELETE FROM debounce_sync WHERE project_id = ?`).bind(projectId).run()
}
