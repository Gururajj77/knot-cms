import type { ApiErrorBody, SyncErrorCode } from "@notion-framer/shared"
import { userMessageForCode } from "@notion-framer/shared"

export class ApiRequestError extends Error {
    readonly code: SyncErrorCode
    readonly details?: Record<string, unknown>

    constructor(body: ApiErrorBody) {
        super(body.error)
        this.name = "ApiRequestError"
        this.code = body.code
        this.details = body.details
    }
}

export function formatStatusError(status: {
    lastError: string | null
    lastErrorCode: string | null
}): string | null {
    if (!status.lastError && !status.lastErrorCode) return null
    if (status.lastErrorCode) {
        return userMessageForCode(status.lastErrorCode as SyncErrorCode, status.lastError ?? undefined)
    }
    return status.lastError
}

export function parseApiErrorBody(body: unknown): ApiErrorBody | null {
    if (!body || typeof body !== "object") return null
    const b = body as Record<string, unknown>
    if (typeof b.error !== "string") return null
    const code = typeof b.code === "string" ? (b.code as SyncErrorCode) : "UNKNOWN"
    return {
        error: b.error,
        code,
        details: typeof b.details === "object" && b.details !== null ? (b.details as Record<string, unknown>) : undefined,
    }
}
