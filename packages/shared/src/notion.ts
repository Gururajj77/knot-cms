export const NOTION_VERSION = "2025-09-03"

export interface NotionPage {
    id: string
    last_edited_time: string
    properties: Record<string, NotionPropertyValue>
}

export type NotionPropertyValue =
    | { type: "title"; title: Array<{ plain_text: string }> }
    | { type: "rich_text"; rich_text: Array<{ plain_text: string }> }
    | { type: "number"; number: number | null }
    | { type: "checkbox"; checkbox: boolean }
    | { type: "select"; select: { id: string; name: string } | null }
    | { type: "status"; status: { id: string; name: string } | null }
    | { type: "multi_select"; multi_select: Array<{ id: string; name: string }> }
    | { type: "date"; date: { start: string; end?: string | null } | null }
    | { type: "url"; url: string | null }
    | { type: "email"; email: string | null }
    | { type: "phone_number"; phone_number: string | null }
    | { type: "files"; files: Array<{ type: string; file?: { url: string }; external?: { url: string } }> }
    | { type: string; [key: string]: unknown }

export async function notionFetch<T>(
    token: string,
    path: string,
    init?: RequestInit
): Promise<T> {
    const response = await fetch(`https://api.notion.com/v1${path}`, {
        ...init,
        headers: {
            Authorization: `Bearer ${token}`,
            "Notion-Version": NOTION_VERSION,
            "Content-Type": "application/json",
            ...init?.headers,
        },
    })

    if (!response.ok) {
        const body = await response.text()
        throw new Error(`Notion API ${response.status}: ${body}`)
    }

    return response.json() as Promise<T>
}

export async function searchDataSources(token: string): Promise<
    Array<{ id: string; title: string; databaseId?: string }>
> {
    const result = await notionFetch<{
        results: Array<{
            object: string
            id: string
            title?: Array<{ plain_text: string }>
            database_parent?: { database_id: string }
        }>
    }>(token, "/search", {
        method: "POST",
        body: JSON.stringify({
            filter: { value: "data_source", property: "object" },
            page_size: 100,
        }),
    })

    return result.results
        .filter(r => r.object === "data_source")
        .map(r => ({
            id: r.id,
            title: r.title?.map(t => t.plain_text).join("") || "Untitled",
            databaseId: r.database_parent?.database_id,
        }))
}

export interface NotionPageSummary {
    id: string
    title: string
}

export interface CreateNotionDatabaseInput {
    parentPageId: string
    title: string
    properties: Record<string, Record<string, unknown>>
}

export interface CreateNotionDatabaseResult {
    databaseId: string
    dataSourceId: string
    title: string
}

/** Extract a Notion page/database ID from a pasted URL or raw ID. */
export function normalizeNotionPageId(input: string): string | null {
    const trimmed = input.trim()
    if (!trimmed) return null

    const uuidMatch = trimmed.match(
        /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i
    )
    if (uuidMatch?.[1]) return uuidMatch[1].toLowerCase()

    const compact = trimmed.match(/([0-9a-f]{32})/i)?.[1]
    if (!compact) return null

    return `${compact.slice(0, 8)}-${compact.slice(8, 12)}-${compact.slice(12, 16)}-${compact.slice(16, 20)}-${compact.slice(20)}`.toLowerCase()
}

export async function searchNotionPages(token: string, query: string): Promise<NotionPageSummary[]> {
    const result = await notionFetch<{
        results: Array<{
            object: string
            id: string
            url?: string
            properties?: Record<string, NotionPropertyValue>
        }>
    }>(token, "/search", {
        method: "POST",
        body: JSON.stringify({
            query: query.trim() || undefined,
            filter: { value: "page", property: "object" },
            page_size: 20,
        }),
    })

    return result.results
        .filter(page => page.object === "page")
        .map(page => ({
            id: page.id,
            title: extractPageTitle(page.properties) || "Untitled",
        }))
}

function extractPageTitle(properties: Record<string, NotionPropertyValue> | undefined): string {
    if (!properties) return ""
    for (const value of Object.values(properties)) {
        if (value.type === "title") {
            return extractPlainText(value)
        }
    }
    return ""
}

export async function createNotionDatabase(
    token: string,
    input: CreateNotionDatabaseInput
): Promise<CreateNotionDatabaseResult> {
    const parentPageId = normalizeNotionPageId(input.parentPageId)
    if (!parentPageId) {
        throw new Error("Invalid Notion parent page ID or URL")
    }

    const result = await notionFetch<{
        id: string
        title?: Array<{ plain_text: string }>
        data_sources?: Array<{ id: string; name: string }>
    }>(token, "/databases", {
        method: "POST",
        body: JSON.stringify({
            parent: { type: "page_id", page_id: parentPageId },
            title: [{ type: "text", text: { content: input.title.trim() || "Untitled" } }],
            is_inline: false,
            initial_data_source: {
                properties: input.properties,
            },
        }),
    })

    const dataSourceId = result.data_sources?.[0]?.id
    if (!dataSourceId) {
        throw new Error("Notion created the database but returned no data source id")
    }

    return {
        databaseId: result.id,
        dataSourceId,
        title: result.title?.map(t => t.plain_text).join("") || input.title,
    }
}

export async function createNotionDataSourcePage(
    token: string,
    dataSourceId: string,
    properties: Record<string, Record<string, unknown>>
): Promise<string> {
    const result = await notionFetch<{ id: string }>(token, "/pages", {
        method: "POST",
        body: JSON.stringify({
            parent: { type: "data_source_id", data_source_id: dataSourceId },
            properties,
        }),
    })
    return result.id
}

export interface ImportFramerItemsResult {
    imported: number
    skipped: number
    warnings: string[]
}

export async function importNotionPages(
    token: string,
    dataSourceId: string,
    propertySets: Array<Record<string, Record<string, unknown>>>
): Promise<ImportFramerItemsResult> {
    let imported = 0
    let skipped = 0
    const warnings: string[] = []

    for (const properties of propertySets) {
        try {
            await createNotionDataSourcePage(token, dataSourceId, properties)
            imported++
        } catch (error) {
            skipped++
            const message = error instanceof Error ? error.message : String(error)
            warnings.push(message.slice(0, 200))
        }
    }

    return { imported, skipped, warnings }
}

export async function getDataSourceProperties(
    token: string,
    dataSourceId: string
): Promise<Array<{ id: string; name: string; type: string }>> {
    const ds = await notionFetch<{
        properties: Record<string, { id: string; name: string; type: string }>
    }>(token, `/data_sources/${dataSourceId}`)

    return Object.values(ds.properties).map(p => ({
        id: p.id,
        name: p.name,
        type: p.type,
    }))
}

export async function queryDataSourcePages(
    token: string,
    dataSourceId: string
): Promise<NotionPage[]> {
    const pages: NotionPage[] = []
    let cursor: string | undefined

    do {
        const result = await notionFetch<{
            results: NotionPage[]
            has_more: boolean
            next_cursor: string | null
        }>(token, `/data_sources/${dataSourceId}/query`, {
            method: "POST",
            body: JSON.stringify({
                page_size: 100,
                start_cursor: cursor,
            }),
        })

        pages.push(...result.results)
        cursor = result.has_more ? (result.next_cursor ?? undefined) : undefined
    } while (cursor)

    return pages
}

export function extractPlainText(value: NotionPropertyValue | undefined): string {
    if (!value) return ""

    switch (value.type) {
        case "title": {
            const title = value as Extract<NotionPropertyValue, { type: "title" }>
            return title.title.map(t => t.plain_text).join("")
        }
        case "rich_text": {
            const rich = value as Extract<NotionPropertyValue, { type: "rich_text" }>
            return rich.rich_text.map(t => t.plain_text).join("")
        }
        case "url": {
            const url = value as Extract<NotionPropertyValue, { type: "url" }>
            return url.url ?? ""
        }
        case "email": {
            const email = value as Extract<NotionPropertyValue, { type: "email" }>
            return email.email ?? ""
        }
        case "phone_number": {
            const phone = value as Extract<NotionPropertyValue, { type: "phone_number" }>
            return phone.phone_number ?? ""
        }
        default:
            return ""
    }
}

export function slugify(text: string): string {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 120) || "item"
}
