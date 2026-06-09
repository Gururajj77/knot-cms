import type {
    CreateProjectInput,
    DashboardCreateProjectInput,
    FieldMapping,
    ProjectStatus,
    PublishMode,
    UpdatePublishSettingsInput,
} from "@notion-framer/shared"
import { decrypt, encrypt } from "../crypto.js"
import type { Env } from "../env.js"
import { getCustomerById, isCustomerEntitled } from "./customers.js"
import { replaceFieldMappings } from "./mappings.js"
import { deleteSetupSession, getSetupSessionToken } from "./sessions.js"
import { clearLastPublishAt } from "./sync-state.js"
import { verifyFramerCredentials } from "../sync/verifyFramerCredentials.js"
import { type ProjectRow, type ProjectStatusRow, projectRowToStatus } from "./types.js"

export type { ProjectRow } from "./types.js"

const PROJECT_STATUS_SQL = `
  SELECT
    p.*,
    s.last_sync_at,
    s.last_error,
    s.last_error_code,
    s.items_synced_count,
    w.status AS webhook_status,
    sec.source_webhook_verification_token,
    integ.value AS integration_webhook_verification_token,
    c.subscription_status AS customer_subscription_status
  FROM projects p
  LEFT JOIN sync_state s ON s.project_id = p.id
  LEFT JOIN webhook_subscriptions w ON w.project_id = p.id
  LEFT JOIN secrets sec ON sec.project_id = p.id
  LEFT JOIN integration_settings integ ON integ.key = 'notion_webhook_verification_token'
  LEFT JOIN customers c ON c.id = p.customer_id
  WHERE p.id = ?
`

export async function getProject(env: Env, projectId: string): Promise<ProjectRow | null> {
    return env.DB.prepare(`SELECT * FROM projects WHERE id = ?`).bind(projectId).first<ProjectRow>()
}

export async function listProjectsByCustomerId(env: Env, customerId: string): Promise<ProjectStatus[]> {
    const result = await env.DB.prepare(
        `${PROJECT_STATUS_SQL.replace("WHERE p.id = ?", "WHERE p.customer_id = ? ORDER BY p.updated_at DESC")}`
    )
        .bind(customerId)
        .all<ProjectStatusRow>()

    return (result.results ?? []).map(projectRowToStatus)
}

export async function getProjectForCustomer(
    env: Env,
    projectId: string,
    customerId: string
): Promise<ProjectRow | null> {
    return env.DB.prepare(`SELECT * FROM projects WHERE id = ? AND customer_id = ?`)
        .bind(projectId, customerId)
        .first<ProjectRow>()
}

export async function findProjectByFramerAndNotionSource(
    env: Env,
    framerProjectUrl: string,
    notionDataSourceId: string
): Promise<ProjectRow | null> {
    return env.DB.prepare(
        `SELECT * FROM projects
     WHERE framer_project_url = ? AND source_provider = 'notion' AND source_data_source_id = ?`
    )
        .bind(framerProjectUrl.trim(), notionDataSourceId)
        .first<ProjectRow>()
}

export async function findProjectsByNotionSource(env: Env, sourceId: string): Promise<ProjectRow[]> {
    const result = await env.DB.prepare(
        `SELECT p.* FROM projects p
     LEFT JOIN customers c ON c.id = p.customer_id
     WHERE p.auto_sync = 1
       AND (p.source_data_source_id = ? OR p.source_database_id = ?)
       AND (p.customer_id IS NULL OR c.subscription_status = 'active')`
    )
        .bind(sourceId, sourceId)
        .all<ProjectRow>()
    return result.results ?? []
}

export async function isProjectEntitled(env: Env, project: ProjectRow): Promise<boolean> {
    if (!project.customer_id) return true
    const customer = await getCustomerById(env, project.customer_id)
    return isCustomerEntitled(customer)
}

export async function getProjectSecrets(
    env: Env,
    projectId: string
): Promise<{ notionToken: string; framerApiKey: string; webhookToken: string | null } | null> {
    const row = await env.DB.prepare(`SELECT * FROM secrets WHERE project_id = ?`)
        .bind(projectId)
        .first<{
            source_access_token_enc: string
            framer_api_key_enc: string
            source_webhook_verification_token: string | null
        }>()

    if (!row) return null

    return {
        notionToken: await decrypt(env.ENCRYPTION_KEY, row.source_access_token_enc),
        framerApiKey: await decrypt(env.ENCRYPTION_KEY, row.framer_api_key_enc),
        webhookToken: row.source_webhook_verification_token,
    }
}

export async function getProjectStatus(env: Env, projectId: string): Promise<ProjectStatus | null> {
    const row = await env.DB.prepare(PROJECT_STATUS_SQL).bind(projectId).first<ProjectStatusRow>()
    if (!row) return null
    return projectRowToStatus(row)
}

export async function createOrUpdateProject(
    env: Env,
    input: CreateProjectInput | DashboardCreateProjectInput,
    options?: { customerId?: string | null }
): Promise<string> {
    const customerId = options?.customerId ?? null
    const { projectUrl: framerProjectUrl, apiKey: framerApiKey } = await verifyFramerCredentials(
        input.framerProjectUrl,
        input.framerApiKey
    )

    const existing = await findProjectByFramerAndNotionSource(
        env,
        framerProjectUrl,
        input.notionDataSourceId
    )
    const notionToken = await getSetupSessionToken(env, input.setupSessionId)
    const framerEnc = await encrypt(env.ENCRYPTION_KEY, framerApiKey)
    const collectionName = input.notionDataSourceTitle?.trim() || "Notion Sync"

    if (existing) {
        const updates = [
            env.DB.prepare(
                `UPDATE projects SET
          framer_project_url = ?, source_data_source_id = ?, source_database_id = ?,
          source_title = ?, framer_collection_name = ?, slug_source_property_id = ?,
          auto_sync = ?, auto_publish = ?, publish_mode = ?,
          customer_id = COALESCE(?, customer_id),
          updated_at = datetime('now')
         WHERE id = ?`
            ).bind(
                framerProjectUrl,
                input.notionDataSourceId,
                input.notionDatabaseId ?? null,
                input.notionDataSourceTitle ?? null,
                collectionName,
                input.slugNotionPropertyId,
                input.autoSync ? 1 : 0,
                input.autoPublish ? 1 : 0,
                input.publishMode,
                customerId,
                existing.id
            ),
        ]

        if (notionToken) {
            const notionEnc = await encrypt(env.ENCRYPTION_KEY, notionToken)
            updates.push(
                env.DB.prepare(
                    `UPDATE secrets SET source_access_token_enc = ?, framer_api_key_enc = ? WHERE project_id = ?`
                ).bind(notionEnc, framerEnc, existing.id)
            )
        } else {
            updates.push(
                env.DB.prepare(`UPDATE secrets SET framer_api_key_enc = ? WHERE project_id = ?`).bind(
                    framerEnc,
                    existing.id
                )
            )
        }

        await env.DB.batch(updates)
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

    await env.DB.batch([
        env.DB.prepare(
            `INSERT INTO projects (
          id, customer_id, framer_project_url, framer_collection_id, framer_collection_name,
          source_provider, source_data_source_id, source_database_id, source_title,
          slug_source_property_id, auto_sync, auto_publish, publish_mode, updated_at
        ) VALUES (?, ?, ?, ?, ?, 'notion', ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
        ).bind(
            projectId,
            customerId,
            framerProjectUrl,
            input.framerCollectionId ?? "pending",
            collectionName,
            input.notionDataSourceId,
            input.notionDatabaseId ?? null,
            input.notionDataSourceTitle ?? null,
            input.slugNotionPropertyId,
            input.autoSync ? 1 : 0,
            input.autoPublish ? 1 : 0,
            input.publishMode
        ),
        env.DB.prepare(
            `INSERT INTO secrets (project_id, source_access_token_enc, framer_api_key_enc)
       VALUES (?, ?, ?)`
        ).bind(projectId, notionEnc, framerEnc),
        env.DB.prepare(`INSERT INTO sync_state (project_id) VALUES (?)`).bind(projectId),
        env.DB.prepare(`INSERT INTO webhook_subscriptions (project_id, status) VALUES (?, 'pending')`).bind(
            projectId
        ),
    ])

    await replaceFieldMappings(env, projectId, input.fieldMappings)
    await deleteSetupSession(env, input.setupSessionId)

    return projectId
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

    const enablingAutoPublish = settings.autoPublish && project.auto_publish !== 1

    await env.DB.prepare(
        `UPDATE projects SET auto_publish = ?, publish_mode = ?, updated_at = datetime('now') WHERE id = ?`
    )
        .bind(settings.autoPublish ? 1 : 0, publishMode, projectId)
        .run()

    if (enablingAutoPublish) {
        await clearLastPublishAt(env, projectId)
    }

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
