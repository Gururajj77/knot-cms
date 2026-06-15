import type {
    CreateProjectInput,
    FieldMapping,
    ProjectStatus,
    PublishMode,
    ReconfigureProjectContext,
    ReconfigureProjectInput,
    UpdateAutomationSettingsInput,
    UpdatePublishSettingsInput,
} from "@knotcms/shared"
import {
    effectiveProjectLimit,
    getPlan,
    isOverProjectLimit,
    managedCollectionSyncName,
    PENDING_FRAMER_COLLECTION_ID,
    resolveProjectFramerSyncMode,
    usesExplicitFramerCollectionId,
} from "@knotcms/shared"
import { decrypt, encrypt } from "../crypto.js"
import type { Env } from "../env.js"
import { effectivePlanId } from "../lib/entitlements.js"
import { countProjectsForCustomer, getCustomerById, isCustomerEntitled } from "./customers.js"
import { getProjectMappings, replaceFieldMappings } from "./mappings.js"
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
    s.last_publish_at,
    w.status AS webhook_status,
    sec.source_webhook_verification_token,
    integ.value AS integration_webhook_verification_token,
    c.subscription_status AS customer_subscription_status,
    c.plan_id AS customer_plan_id
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
     WHERE p.auto_sync = 1
       AND (p.source_data_source_id = ? OR p.source_database_id = ?)`
    )
        .bind(sourceId, sourceId)
        .all<ProjectRow>()

    const projects = result.results ?? []
    const eligible: ProjectRow[] = []
    for (const project of projects) {
        if (await isProjectAutoSyncEligible(env, project)) {
            eligible.push(project)
        }
    }
    return eligible
}

export async function isProjectEntitled(env: Env, project: ProjectRow): Promise<boolean> {
    if (!project.customer_id) return true
    const customer = await getCustomerById(env, project.customer_id)
    return isCustomerEntitled(customer)
}

export async function isProjectAutoSyncEligible(env: Env, project: ProjectRow): Promise<boolean> {
    if (project.auto_sync !== 1) return false
    if (!(await isProjectEntitled(env, project))) return false
    if (!project.customer_id) return true

    const customer = await getCustomerById(env, project.customer_id)
    if (!customer) return false

    const plan = getPlan(effectivePlanId(customer))
    const projectCount = await countProjectsForCustomer(env, customer.id)
    const projectLimit =
        plan.id === "basic"
            ? plan.projectLimit
            : effectiveProjectLimit(customer)
    if (isOverProjectLimit(projectCount, projectLimit)) return false

    return plan.features.autoSync
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
    input: CreateProjectInput,
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
    const syncMode = input.framerSyncMode ?? "managed"
    const framerCollectionId = usesExplicitFramerCollectionId(syncMode)
        ? (input.framerCollectionId ?? PENDING_FRAMER_COLLECTION_ID)
        : PENDING_FRAMER_COLLECTION_ID
    const framerCollectionName =
        syncMode === "managed"
            ? managedCollectionSyncName(input.notionDataSourceTitle)
            : input.framerCollectionName?.trim() ||
              input.notionDataSourceTitle?.trim() ||
              "Framer CMS"
    const framerTemplateCollectionId = input.framerTemplateCollectionId?.trim() || null

    if (usesExplicitFramerCollectionId(syncMode) && framerCollectionId === PENDING_FRAMER_COLLECTION_ID) {
        throw new Error("Framer collection id is required when syncing to a selected CMS collection.")
    }

    if (existing) {
        const updates = [
            env.DB.prepare(
                `UPDATE projects SET
          framer_project_url = ?, framer_collection_id = ?, framer_sync_mode = ?,
          framer_template_collection_id = COALESCE(?, framer_template_collection_id),
          source_data_source_id = ?, source_database_id = ?,
          source_title = ?, framer_collection_name = ?, slug_source_property_id = ?,
          auto_sync = ?, auto_publish = ?, publish_mode = ?,
          preserve_unlinked_framer_rows = ?,
          customer_id = COALESCE(?, customer_id),
          updated_at = datetime('now')
         WHERE id = ?`
            ).bind(
                framerProjectUrl,
                framerCollectionId,
                syncMode,
                framerTemplateCollectionId,
                input.notionDataSourceId,
                input.notionDatabaseId ?? null,
                input.notionDataSourceTitle ?? null,
                framerCollectionName,
                input.slugNotionPropertyId,
                input.autoSync ? 1 : 0,
                input.autoPublish ? 1 : 0,
                input.publishMode,
                input.preserveUnlinkedFramerRows ? 1 : 0,
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
          framer_template_collection_id, framer_sync_mode, source_provider, source_data_source_id, source_database_id, source_title,
          slug_source_property_id, auto_sync, auto_publish, publish_mode,
          preserve_unlinked_framer_rows, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'notion', ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
        ).bind(
            projectId,
            customerId,
            framerProjectUrl,
            framerCollectionId,
            framerCollectionName,
            framerTemplateCollectionId,
            syncMode,
            input.notionDataSourceId,
            input.notionDatabaseId ?? null,
            input.notionDataSourceTitle ?? null,
            input.slugNotionPropertyId,
            input.autoSync ? 1 : 0,
            input.autoPublish ? 1 : 0,
            input.publishMode,
            input.preserveUnlinkedFramerRows ? 1 : 0
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

export async function updateProjectAutomationSettings(
    env: Env,
    projectId: string,
    settings: UpdateAutomationSettingsInput
): Promise<ProjectStatus | null> {
    const project = await getProject(env, projectId)
    if (!project) return null

    await env.DB.prepare(
        `UPDATE projects SET auto_sync = ?, updated_at = datetime('now') WHERE id = ?`
    )
        .bind(settings.autoSync ? 1 : 0, projectId)
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

export class ReconfigureProjectConflictError extends Error {
    constructor() {
        super("This Framer site is already linked to that Notion database in another project.")
        this.name = "ReconfigureProjectConflictError"
    }
}

export async function getReconfigureProjectContext(
    env: Env,
    projectId: string,
    customerId: string
): Promise<ReconfigureProjectContext | null> {
    const project = await getProjectForCustomer(env, projectId, customerId)
    if (!project) return null

    return {
        projectId,
        framerProjectUrl: project.framer_project_url,
        framerCollectionId: project.framer_collection_id,
        framerCollectionName: project.framer_collection_name,
        framerTemplateCollectionId: project.framer_template_collection_id ?? null,
        notionDataSourceId: project.source_data_source_id,
        notionDataSourceTitle: project.source_title,
        slugNotionPropertyId: project.slug_source_property_id,
        fieldMappings: await getProjectMappings(env, projectId),
        autoSync: project.auto_sync === 1,
        autoPublish: project.auto_publish === 1,
        publishMode: project.publish_mode as PublishMode,
        framerSyncMode: resolveProjectFramerSyncMode(project),
    }
}

export async function reconfigureProject(
    env: Env,
    projectId: string,
    customerId: string,
    input: ReconfigureProjectInput
): Promise<void> {
    const project = await getProjectForCustomer(env, projectId, customerId)
    if (!project) {
        throw new Error("Project not found")
    }

    const { projectUrl: framerProjectUrl, apiKey: framerApiKey } = await verifyFramerCredentials(
        project.framer_project_url,
        input.framerApiKey
    )

    const conflict = await findProjectByFramerAndNotionSource(
        env,
        framerProjectUrl,
        input.notionDataSourceId
    )
    if (conflict && conflict.id !== projectId) {
        throw new ReconfigureProjectConflictError()
    }

    const notionToken = await getSetupSessionToken(env, input.setupSessionId)
    if (!notionToken) {
        throw new Error("Setup session expired. Connect Notion again and retry.")
    }

    const syncMode = resolveProjectFramerSyncMode(project)
    const nextTitle = input.notionDataSourceTitle?.trim() || project.source_title
    const framerCollectionName =
        syncMode === "managed" && nextTitle
            ? managedCollectionSyncName(nextTitle)
            : project.framer_collection_name

    const notionEnc = await encrypt(env.ENCRYPTION_KEY, notionToken)
    const framerEnc = await encrypt(env.ENCRYPTION_KEY, framerApiKey)

    await env.DB.batch([
        env.DB.prepare(
            `UPDATE projects SET
          source_data_source_id = ?, source_database_id = ?, source_title = ?,
          framer_collection_name = ?, slug_source_property_id = ?,
          auto_sync = ?, auto_publish = ?, publish_mode = ?,
          preserve_unlinked_framer_rows = ?, updated_at = datetime('now')
         WHERE id = ?`
        ).bind(
            input.notionDataSourceId,
            input.notionDatabaseId ?? null,
            nextTitle,
            framerCollectionName,
            input.slugNotionPropertyId,
            input.autoSync ? 1 : 0,
            input.autoPublish ? 1 : 0,
            input.publishMode,
            input.preserveUnlinkedFramerRows ? 1 : 0,
            projectId
        ),
        env.DB.prepare(
            `UPDATE secrets SET source_access_token_enc = ?, framer_api_key_enc = ? WHERE project_id = ?`
        ).bind(notionEnc, framerEnc, projectId),
    ])

    await replaceFieldMappings(env, projectId, input.fieldMappings)
    await deleteSetupSession(env, input.setupSessionId)
}
