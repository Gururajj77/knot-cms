import type { FieldMapping } from "./types.js"
import { queryDataSourcePages } from "./notion.js"
import { buildFramerFields, notionPagesToFramerItems, type FramerItemPayload } from "./transforms.js"

export interface SyncPayload {
    fields: ReturnType<typeof buildFramerFields>
    items: FramerItemPayload[]
}

export async function buildSyncPayload(
    notionToken: string,
    dataSourceId: string,
    mappings: FieldMapping[],
    slugNotionPropertyId: string
): Promise<SyncPayload> {
    const pages = await queryDataSourcePages(notionToken, dataSourceId)
    const items = notionPagesToFramerItems(pages, mappings, slugNotionPropertyId)
    const fields = buildFramerFields(mappings)
    return { fields, items }
}
