import { RATE_LIMITED_CODE, RATE_LIMIT_MESSAGES } from "@knotcms/shared"
import type { ToastTone } from "../components/ui/Toast"
import { ApiError } from "./api/client"

const RATE_LIMIT_MESSAGE_SET = new Set(Object.values(RATE_LIMIT_MESSAGES))

export function isRateLimitError(err: unknown): err is ApiError {
    return err instanceof ApiError && err.code === RATE_LIMITED_CODE
}

function isRateLimitMessage(message: string): boolean {
    return RATE_LIMIT_MESSAGE_SET.has(message)
}

export function apiErrorMessage(err: unknown, fallback: string): string {
    if (err instanceof ApiError && err.message) return err.message
    if (err instanceof Error && err.message) return err.message
    return fallback
}

function apiErrorToastTone(err: unknown): ToastTone {
    return isRateLimitError(err) ? "info" : "error"
}

export function messageBannerTone(message: string): "error" | "info" {
    return isRateLimitMessage(message) ? "info" : "error"
}

export function notifyApiError(
    toast: (message: string, tone?: ToastTone) => void,
    err: unknown,
    fallback: string
): void {
    toast(apiErrorMessage(err, fallback), apiErrorToastTone(err))
}
