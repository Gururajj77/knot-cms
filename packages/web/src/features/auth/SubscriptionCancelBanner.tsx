import type { AuthMe } from "../../lib/api"
import { formatSubscriptionEndDate } from "../../lib/format"
import { Banner } from "../../components/ui"

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
        <Banner tone="info">
            Canceled — you keep access until {endDate}.
            {portalUrl ? (
                <>
                    {" "}
                    <a href={portalUrl} className="pf-banner-link" target="_blank" rel="noreferrer">
                        Manage in Polar
                    </a>{" "}
                    to uncancel.
                </>
            ) : null}
        </Banner>
    )
}
