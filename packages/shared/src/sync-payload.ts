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
    slugNotionPropertyId: string,
    maxRows?: number | null
): Promise<SyncPayload> {
    const pages = await queryDataSourcePages(notionToken, dataSourceId)
    let items = notionPagesToFramerItems(pages, mappings, slugNotionPropertyId)
    if (typeof maxRows === "number" && items.length > maxRows) {
        items = items.slice(0, maxRows)
    }
    const fields = buildFramerFields(mappings)
    return { fields, items }
}
