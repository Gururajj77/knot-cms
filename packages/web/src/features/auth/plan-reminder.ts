import { formatSubscriptionEndDate } from "../../lib/format"

const REMINDER_DAYS_BEFORE_RENEWAL = 2

export function computePlanReminderAtLabel(
    subscriptionRenewsAt: string | null | undefined
): string | null {
    const renewsAt = subscriptionRenewsAt?.trim()
    if (!renewsAt) return null

    const reminder = new Date(renewsAt)
    reminder.setDate(reminder.getDate() - REMINDER_DAYS_BEFORE_RENEWAL)
    return formatSubscriptionEndDate(reminder.toISOString())
}
