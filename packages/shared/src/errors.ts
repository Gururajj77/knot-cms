import type { FramerItemPayload } from "./transforms.js"

/** Stable codes for API + plugin UI. */
export type SyncErrorCode =
    | "FRAMER_UNAUTHORIZED"
    | "FRAMER_DUPLICATE_ITEM"
    | "FRAMER_COLLECTION"
    | "SLUG_COLLISION"
    | "NOTION_API"
    | "LICENSE_INACTIVE"
    | "PROJECT_NOT_FOUND"
    | "SECRETS_MISSING"
    | "SYNC_IN_PROGRESS"
    | "UNKNOWN"

export interface ApiErrorBody {
    error: string
    code: SyncErrorCode
    details?: Record<string, unknown>
}

export class SyncBoundaryError extends Error {
    readonly code: SyncErrorCode
    readonly details?: Record<string, unknown>

    constructor(code: SyncErrorCode, message: string, details?: Record<string, unknown>) {
        super(message)
        this.name = "SyncBoundaryError"
        this.code = code
        this.details = details
    }
}

export function userMessageForCode(code: SyncErrorCode, fallback?: string): string {
    switch (code) {
        case "FRAMER_UNAUTHORIZED":
            return "Framer API key does not match this project URL. Reconfigure with the key from this Framer project (Site Settings → API)."
        case "FRAMER_DUPLICATE_ITEM":
            return fallback ?? "A CMS item already uses this id or slug. Fix duplicate slugs in Notion or remove the conflicting item in Framer."
        case "FRAMER_COLLECTION":
            return fallback ?? "Could not create or open the Framer CMS collection."
        case "SLUG_COLLISION":
            return fallback ?? "Two or more Notion pages produce the same slug. Make slug values unique in Notion."
        case "NOTION_API":
            return fallback ?? "Notion API error. Reconnect Notion or check database access."
        case "LICENSE_INACTIVE":
            return "License is inactive or invalid for this Framer project URL."
        case "PROJECT_NOT_FOUND":
            return "Connection not found. Run setup again on this CMS source."
        case "SECRETS_MISSING":
            return "Missing stored credentials. Reconfigure and save your API key."
        case "SYNC_IN_PROGRESS":
            return "Sync already running for this connection. Try again in a moment."
        default:
            return fallback ?? "Sync failed. Check worker logs for details."
    }
}

/** Map thrown errors (Framer API, etc.) to a stable code + user-facing message. */
export function classifySyncError(error: unknown): ApiErrorBody {
    if (error instanceof SyncBoundaryError) {
        return {
            code: error.code,
            error: error.message,
            details: error.details,
        }
    }

    const message = error instanceof Error ? error.message : String(error)
    const lower = message.toLowerCase()

    if (lower.includes("license inactive")) {
        return { code: "LICENSE_INACTIVE", error: userMessageForCode("LICENSE_INACTIVE") }
    }
    if (lower.includes("project not found") || lower.includes("secrets not found")) {
        return {
            code: message.includes("secrets") ? "SECRETS_MISSING" : "PROJECT_NOT_FOUND",
            error: userMessageForCode(message.includes("secrets") ? "SECRETS_MISSING" : "PROJECT_NOT_FOUND"),
        }
    }
    if (lower.includes("sync already in progress")) {
        return { code: "SYNC_IN_PROGRESS", error: userMessageForCode("SYNC_IN_PROGRESS") }
    }
    if (
        lower.includes("does not have access to this project") ||
        lower.includes("unauthorized") ||
        lower.includes("invalid api key")
    ) {
        return { code: "FRAMER_UNAUTHORIZED", error: userMessageForCode("FRAMER_UNAUTHORIZED") }
    }
    if (lower.includes("duplicate id") || lower.includes("duplicate slug")) {
        const slugMatch = message.match(/\(([^)]+)\)\s*$/)
        return {
            code: "FRAMER_DUPLICATE_ITEM",
            error: userMessageForCode(
                "FRAMER_DUPLICATE_ITEM",
                slugMatch
                    ? `Duplicate slug or id in Framer CMS (“${slugMatch[1]}”). Use unique slugs in Notion.`
                    : undefined
            ),
            details: slugMatch ? { slug: slugMatch[1] } : undefined,
        }
    }
    if (lower.includes("notion api")) {
        return { code: "NOTION_API", error: userMessageForCode("NOTION_API", message.slice(0, 200)) }
    }
    if (lower.includes("could not find or create managed collection")) {
        return { code: "FRAMER_COLLECTION", error: userMessageForCode("FRAMER_COLLECTION", message) }
    }

    return { code: "UNKNOWN", error: userMessageForCode("UNKNOWN", message.slice(0, 300)) }
}

export interface SyncValidationResult {
    items: FramerItemPayload[]
    warnings: string[]
}

/**
 * Dedupe by Notion page id and reject duplicate slugs before calling Framer.
 * Does not change mapping logic — only guards the outbound payload.
 */
export function prepareSyncItems(items: FramerItemPayload[]): SyncValidationResult {
    const warnings: string[] = []
    const byId = new Map<string, FramerItemPayload>()

    for (const item of items) {
        if (byId.has(item.id)) {
            warnings.push(`Duplicate Notion page id ${item.id}; keeping first occurrence.`)
            continue
        }
        byId.set(item.id, item)
    }

    const deduped = [...byId.values()]
    const slugToIds = new Map<string, string[]>()

    for (const item of deduped) {
        const list = slugToIds.get(item.slug) ?? []
        list.push(item.id)
        slugToIds.set(item.slug, list)
    }

    const collisions = [...slugToIds.entries()].filter(([, ids]) => ids.length > 1)
    if (collisions.length > 0) {
        const examples = collisions
            .slice(0, 3)
            .map(([slug]) => `“${slug}”`)
            .join(", ")
        throw new SyncBoundaryError(
            "SLUG_COLLISION",
            `Duplicate slugs in Notion: ${examples}${collisions.length > 3 ? "…" : ""}. Each page needs a unique slug.`,
            { slugs: collisions.map(([slug, ids]) => ({ slug, notionPageIds: ids })) }
        )
    }

    return { items: deduped, warnings }
}
