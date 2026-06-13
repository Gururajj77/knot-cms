import { CalendarClock } from "lucide-react"
import type { AuthMe } from "../../lib/api"
import { formatSubscriptionEndDate } from "../../lib/format"
import { UsageCallout } from "../../components/ui/UsageCallout"

interface SubscriptionCancelBannerProps {
    auth: Pick<
        AuthMe,
        "entitled" | "subscriptionCancelAtPeriodEnd" | "subscriptionEndsAt" | "customerPortalUrl"
    >
}

export function SubscriptionCancelBanner({ auth }: SubscriptionCancelBannerProps) {
    if (!auth.entitled || !auth.subscriptionCancelAtPeriodEnd || !auth.subscriptionEndsAt) {
        return null
    }

    const portalUrl = auth.customerPortalUrl?.trim() || null
    const endDate = formatSubscriptionEndDate(auth.subscriptionEndsAt)

    return (
        <UsageCallout
            tone="info"
            icon={<CalendarClock size={18} />}
            title="Subscription ending"
            description={`Your plan stays active until ${endDate}. You can uncancel anytime before then.`}
            actions={
                portalUrl
                    ? [
                          {
                              label: "Manage in Polar",
                              href: portalUrl,
                              variant: "secondary",
                              external: true,
                          },
                      ]
                    : []
            }
        />
    )
}
