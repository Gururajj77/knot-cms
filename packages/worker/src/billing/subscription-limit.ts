/** Only set seat limit when the provider sent an explicit count; otherwise keep existing (or 1 for new paid). */
export function resolveSubscriptionProjectLimit(
    seats: number | null,
    entitled: boolean,
    existingLimit: number | null | undefined
): number | undefined {
    if (!entitled) return undefined
    if (seats !== null) return seats
    if (existingLimit != null && existingLimit > 0) return undefined
    return 1
}
