import {
    buildNotionBootstrapSchema,
    importRowMaxForPlan,
    extractPlainText,
    framerItemToNotionProperties,
    importNotionPages,
    isInPlaceFramerSyncMode,
    PENDING_FRAMER_COLLECTION_ID,
    queryDataSourcePages,
    resolveProjectFramerSyncMode,
    slugify,
    SyncBoundaryError,
    type ImportFromFramerResponse,
} from "@knotcms/shared"
import { getCustomerById } from "../db/customers.js"
import { getProject, getProjectMappings, getProjectSecrets } from "../db.js"
import type { Env } from "../env.js"
import { effectivePlanId } from "../lib/entitlements.js"
import { getFramerCollectionDetails } from "./getFramerCollection.js"

async function existingNotionSlugs(
    token: string,
    dataSourceId: string,
    slugPropertyName: string
): Promise<Set<string>> {
    const pages = await queryDataSourcePages(token, dataSourceId)
    const slugs = new Set<string>()

    for (const page of pages) {
        const value = page.properties[slugPropertyName]
        if (!value) continue
        const text = extractPlainText(value).trim()
        if (text) slugs.add(slugify(text))
    }

    return slugs
}

function resolveImportCollectionId(
    project: {
        framer_collection_id: string
        framer_template_collection_id?: string | null
        framer_sync_mode?: string | null
        framer_collection_name?: string | null
    },
    framerCollectionId?: string
): string {
    if (framerCollectionId?.trim()) return framerCollectionId.trim()

    if (project.framer_template_collection_id?.trim()) {
        return project.framer_template_collection_id.trim()
    }

    const syncMode = resolveProjectFramerSyncMode(project)
    if (
        isInPlaceFramerSyncMode(syncMode) &&
        project.framer_collection_id &&
        project.framer_collection_id !== PENDING_FRAMER_COLLECTION_ID
    ) {
        return project.framer_collection_id
    }

    throw new SyncBoundaryError(
        "FRAMER_COLLECTION",
        "Provide the Framer template collection ID to import from (the collection you used when creating this Notion database)."
    )
}

export async function importFramerRowsToNotion(
    env: Env,
    projectId: string,
    framerCollectionId?: string
): Promise<ImportFromFramerResponse> {
    const project = await getProject(env, projectId)
    if (!project) {
        throw new SyncBoundaryError("PROJECT_NOT_FOUND", "Project not found.")
    }

    const secrets = await getProjectSecrets(env, projectId)
    if (!secrets) {
        throw new SyncBoundaryError("SECRETS_MISSING", "Missing stored credentials.")
    }

    const collectionId = resolveImportCollectionId(project, framerCollectionId)
    const mappings = await getProjectMappings(env, projectId)
    const slugMapping = mappings.find(m => m.notionPropertyId === project.slug_source_property_id)
    if (!slugMapping) {
        throw new SyncBoundaryError(
            "NOTION_API",
            "Could not find the slug field mapping for this project. Reconfigure field mappings and try again."
        )
    }

    const { summary, fields, items } = await getFramerCollectionDetails(
        project.framer_project_url,
        secrets.framerApiKey,
        collectionId
    )

    if (!summary.canUseAsTemplate) {
        throw new SyncBoundaryError(
            "FRAMER_COLLECTION",
            "This Framer collection cannot be used as an import source."
        )
    }

    const schema = buildNotionBootstrapSchema(fields)
    const existingSlugs = await existingNotionSlugs(
        secrets.notionToken,
        project.source_data_source_id,
        slugMapping.notionPropertyName
    )

    const customer = project.customer_id ? await getCustomerById(env, project.customer_id) : null
    const importRowMax = importRowMaxForPlan(customer ? effectivePlanId(customer) : "basic")
    const publishableItems = items.filter(item => !item.draft)
    const importableItems = publishableItems.slice(0, importRowMax)
    const propertySets: Array<Record<string, Record<string, unknown>>> = []
    const warnings: string[] = []
    let skippedForSlug = 0
    let skippedForTitle = 0

    if (publishableItems.length > importRowMax) {
        warnings.push(
            `Only the first ${importRowMax} Framer rows were considered (${publishableItems.length} total).`
        )
    }

    for (const item of importableItems) {
        const slugKey = slugify(item.slug.trim() || item.id)
        if (existingSlugs.has(slugKey)) {
            skippedForSlug++
            continue
        }

        const properties = framerItemToNotionProperties(item, schema, fields)
        if (!properties) {
            skippedForTitle++
            warnings.push(`Skipped Framer row "${item.slug}" — could not resolve a title.`)
            continue
        }

        propertySets.push(properties)
        existingSlugs.add(slugKey)
    }

    if (skippedForSlug > 0) {
        warnings.push(
            `Skipped ${skippedForSlug} row${skippedForSlug === 1 ? "" : "s"} already present in Notion (matched by slug).`
        )
    }

    const importResult = await importNotionPages(
        secrets.notionToken,
        project.source_data_source_id,
        propertySets
    )
    warnings.push(...importResult.warnings)

    if (project.preserve_unlinked_framer_rows === 1) {
        const framerSlugs = new Set(
            publishableItems.map(item => slugify(item.slug.trim() || item.id))
        )
        const notionSlugs = await existingNotionSlugs(
            secrets.notionToken,
            project.source_data_source_id,
            slugMapping.notionPropertyName
        )
        const allFramerRowsLinked = [...framerSlugs].every(slug => notionSlugs.has(slug))
        if (allFramerRowsLinked) {
            await env.DB.prepare(
                `UPDATE projects SET preserve_unlinked_framer_rows = 0, updated_at = datetime('now') WHERE id = ?`
            )
                .bind(projectId)
                .run()
        }
    }

    return {
        imported: importResult.imported,
        skipped: importResult.skipped + skippedForSlug + skippedForTitle,
        warnings,
    }
}
