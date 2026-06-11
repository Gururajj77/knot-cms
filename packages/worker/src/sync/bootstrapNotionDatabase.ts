import {
    BOOTSTRAP_IMPORT_ROW_LIMIT,
    bootstrapPropertiesToFieldMappings,
    buildFramerSyncTarget,
    buildNotionBootstrapSchema,
    createNotionDatabase,
    framerItemToNotionProperties,
    getDataSourceProperties,
    importNotionPages,
    normalizeNotionPageId,
    SyncBoundaryError,
    type BootstrapNotionDatabaseInput,
    type BootstrapNotionDatabaseResponse,
} from "@knotcms/shared"
import {
    bootstrapCacheKey,
    getCachedBootstrapResult,
    saveCachedBootstrapResult,
} from "../db/bootstrap-cache.js"
import { getSetupSessionToken } from "../db.js"
import type { Env } from "../env.js"
import { getFramerCollectionDetails } from "./getFramerCollection.js"

const CACHE_REUSE_WARNING =
    "Reusing the Notion database created earlier in this setup session (no duplicate was created)."

export async function bootstrapNotionDatabase(
    env: Env,
    input: BootstrapNotionDatabaseInput
): Promise<BootstrapNotionDatabaseResponse> {
    const token = await getSetupSessionToken(env, input.setupSessionId)
    if (!token) {
        throw new Error("Session expired. Reconnect Notion.")
    }

    const parentPageId = normalizeNotionPageId(input.parentPageId)
    if (!parentPageId) {
        throw new Error(
            "Invalid Notion parent page ID or URL. Search for the page in the picker or paste a Notion page link."
        )
    }

    const { summary, fields, items } = await getFramerCollectionDetails(
        input.framerProjectUrl,
        input.framerApiKey,
        input.framerCollectionId
    )

    if (!summary.canUseAsTemplate) {
        throw new SyncBoundaryError(
            "FRAMER_COLLECTION",
            "This Framer collection cannot be used as a template. Pick a user or KnotCMS-managed collection."
        )
    }

    const databaseTitle = input.databaseTitle?.trim() || summary.name
    const cacheKey = bootstrapCacheKey({
        setupSessionId: input.setupSessionId,
        framerCollectionId: input.framerCollectionId,
        parentPageId,
        databaseTitle,
    })

    const cached = await getCachedBootstrapResult(env, cacheKey)
    if (cached) {
        return {
            ...cached,
            fromCache: true,
            warnings: cached.warnings.includes(CACHE_REUSE_WARNING)
                ? cached.warnings
                : [CACHE_REUSE_WARNING, ...cached.warnings],
        }
    }

    const schema = buildNotionBootstrapSchema(fields)
    const created = await createNotionDatabase(token, {
        parentPageId,
        title: databaseTitle,
        properties: schema.properties,
    })

    const importableItems = items.filter(item => !item.draft).slice(0, BOOTSTRAP_IMPORT_ROW_LIMIT)
    const propertySets: Array<Record<string, Record<string, unknown>>> = []
    const importWarnings: string[] = []

    if (items.length > BOOTSTRAP_IMPORT_ROW_LIMIT) {
        importWarnings.push(
            `Only the first ${BOOTSTRAP_IMPORT_ROW_LIMIT} Framer rows were imported (${items.length} total).`
        )
    }

    for (const item of importableItems) {
        const properties = framerItemToNotionProperties(item, schema, fields)
        if (!properties) {
            importWarnings.push(`Skipped Framer row "${item.slug}" — could not resolve a title.`)
            continue
        }
        propertySets.push(properties)
    }

    const importResult = await importNotionPages(token, created.dataSourceId, propertySets)
    importWarnings.push(...importResult.warnings)

    const properties = await getDataSourceProperties(token, created.dataSourceId)

    const result: BootstrapNotionDatabaseResponse = {
        databaseId: created.databaseId,
        dataSourceId: created.dataSourceId,
        title: created.title,
        properties,
        fieldMappings: bootstrapPropertiesToFieldMappings(properties, schema, fields),
        warnings: [...schema.warnings, ...importWarnings],
        itemsImported: importResult.imported,
        itemsSkipped: importResult.skipped + (importableItems.length - propertySets.length),
        importWarnings,
        framerSyncTarget: buildFramerSyncTarget(summary, created.title),
    }

    await saveCachedBootstrapResult(env, cacheKey, result)
    return result
}
