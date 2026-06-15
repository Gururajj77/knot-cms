import { CalendarClock } from "lucide-react"
import type { AuthMe } from "../../lib/api"
import { formatSubscriptionEndDate } from "../../lib/format"
import { UsageCallout } from "../../components/ui/UsageCallout"
import { BillingPortalButton } from "./BillingPortalButton"

interface SubscriptionCancelBannerProps {
    auth: Pick<
        AuthMe,
        | "entitled"
        | "subscriptionCancelAtPeriodEnd"
        | "subscriptionEndsAt"
        | "customerPortalUrl"
        | "portalUsesApi"
    >
}

export function SubscriptionCancelBanner({ auth }: SubscriptionCancelBannerProps) {
    if (!auth.entitled || !auth.subscriptionCancelAtPeriodEnd || !auth.subscriptionEndsAt) {
        return null
    }

    const portalUrl = auth.customerPortalUrl?.trim() || null
    const portalUsesApi = Boolean(auth.portalUsesApi)
    const endDate = formatSubscriptionEndDate(auth.subscriptionEndsAt)
    const showPortal = portalUsesApi || Boolean(portalUrl)

    return (
        <div className="pf-subscription-cancel-banner">
            <UsageCallout
                tone="info"
                icon={<CalendarClock size={18} />}
                title="Subscription ending"
                description={`Your plan stays active until ${endDate}. You can uncancel anytime before then.`}
                actions={
                    portalUrl && !portalUsesApi
                        ? [
                              {
                                  label: "Manage in billing portal",
                                  href: portalUrl,
                                  variant: "secondary",
                                  external: true,
                              },
                          ]
                        : []
                }
            />
            {showPortal && portalUsesApi ? (
                <div className="pf-subscription-cancel-portal">
                    <BillingPortalButton
                        portalUrl={null}
                        portalUsesApi
                        variant="secondary"
                    >
                        Manage in billing portal
                    </BillingPortalButton>
                </div>
            ) : null}
        </div>
    )
}
