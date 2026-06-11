import type { BootstrapNotionDatabaseResponse } from "@knotcms/shared"
import type { Env } from "../env.js"

export function bootstrapCacheKey(input: {
    setupSessionId: string
    framerCollectionId: string
    parentPageId: string
    databaseTitle: string
}): {
    setupSessionId: string
    framerCollectionId: string
    parentPageId: string
    databaseTitle: string
} {
    return {
        setupSessionId: input.setupSessionId,
        framerCollectionId: input.framerCollectionId,
        parentPageId: input.parentPageId.toLowerCase(),
        databaseTitle: input.databaseTitle.trim() || "Untitled",
    }
}

export async function getCachedBootstrapResult(
    env: Env,
    key: ReturnType<typeof bootstrapCacheKey>
): Promise<BootstrapNotionDatabaseResponse | null> {
    const row = await env.DB.prepare(
        `SELECT result_json FROM setup_bootstrap_cache
     WHERE setup_session_id = ? AND framer_collection_id = ? AND parent_page_id = ? AND database_title = ?`
    )
        .bind(key.setupSessionId, key.framerCollectionId, key.parentPageId, key.databaseTitle)
        .first<{ result_json: string }>()

    if (!row?.result_json) return null

    try {
        return JSON.parse(row.result_json) as BootstrapNotionDatabaseResponse
    } catch {
        return null
    }
}

export async function saveCachedBootstrapResult(
    env: Env,
    key: ReturnType<typeof bootstrapCacheKey>,
    result: BootstrapNotionDatabaseResponse
): Promise<void> {
    await env.DB.prepare(
        `INSERT INTO setup_bootstrap_cache (
      setup_session_id, framer_collection_id, parent_page_id, database_title, result_json
    ) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(setup_session_id, framer_collection_id, parent_page_id, database_title)
    DO UPDATE SET result_json = excluded.result_json, created_at = datetime('now')`
    )
        .bind(
            key.setupSessionId,
            key.framerCollectionId,
            key.parentPageId,
            key.databaseTitle,
            JSON.stringify(result)
        )
        .run()
}
