import { ApiError } from "./api/client"
import { ROUTES } from "../constants/routes"

export function isPlanLimitError(err: unknown): err is ApiError {
    return err instanceof ApiError && err.code === "PLAN_LIMIT"
}

export function formatPlanLimitError(err: ApiError): string {
    return err.message
}

export function planLimitUpgradeHref(err: ApiError): string {
    return err.checkoutUrl?.trim() || ROUTES.subscribe
}
