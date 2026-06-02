import type { ApiErrorBody, SyncErrorCode } from "@notion-framer/shared"
import { classifySyncError } from "@notion-framer/shared"

export function apiErrorFromUnknown(error: unknown, fallbackCode: SyncErrorCode = "UNKNOWN"): ApiErrorBody {
    const classified = classifySyncError(error)
    if (classified.code !== "UNKNOWN") return classified
    return {
        code: fallbackCode,
        error: classified.error,
        details: classified.details,
    }
}

export function jsonApiError(error: unknown, status = 500): Response {
    const body = apiErrorFromUnknown(error)
    return Response.json(body, { status })
}
