import {
    BOOTSTRAP_IMPORT_ROW_LIMIT,
    bootstrapPropertiesToFieldMappings,
    buildFramerSyncTarget,
    buildNotionBootstrapSchema,
    createNotionDatabase,
    framerItemToNotionProperties,
    getDataSourceProperties,
    importNotionPages,
    SyncBoundaryError,
    userMessageForCode,
    type BootstrapNotionDatabaseInput,
    type BootstrapNotionDatabaseResponse,
} from "@knotcms/shared"
import { getSetupSessionToken } from "../db.js"
import type { Env } from "../env.js"
import { getFramerCollectionDetails } from "./getFramerCollection.js"

export async function bootstrapNotionDatabase(
    env: Env,
    input: BootstrapNotionDatabaseInput
): Promise<BootstrapNotionDatabaseResponse> {
    const token = await getSetupSessionToken(env, input.setupSessionId)
    if (!token) {
        throw new Error("Session expired. Reconnect Notion.")
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

    const schema = buildNotionBootstrapSchema(fields)
    const created = await createNotionDatabase(token, {
        parentPageId: input.parentPageId,
        title: input.databaseTitle?.trim() || summary.name,
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

    return {
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
}
