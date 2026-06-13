import { useEffect } from "react"
import { Link, useLocation } from "react-router-dom"
import { PRODUCT_NAME } from "../../components/brand"
import { useAuthContext } from "../../app/AuthContext"
import { ROUTES } from "../../constants/routes"
import { logout } from "../../lib/api"
import { AppShell } from "../../components/layout"
import { showsManageBilling, showsPaidPlanOptions, resolvePlanCheckoutUrls } from "../auth/plans"
import { PlanUsagePanel } from "../auth/PlanUsagePanel"
import { SubscriptionCancelBanner } from "../auth/SubscriptionCancelBanner"
import { PricingPlans } from "../auth/PricingPlans"
import { Button, ButtonLink, Spinner, buttonClass } from "../../components/ui"

function profileSubtitle(planId: string | undefined, entitled: boolean): string {
    if (showsManageBilling(planId)) {
        return entitled
            ? `Your ${PRODUCT_NAME} account, limits, and billing.`
            : `Your subscription is inactive. Manage billing to renew or update payment.`
    }
    return `Subscribe per project to unlock ${PRODUCT_NAME} — use the same email at checkout.`
}

export function ProfilePlansPage() {
    const { auth, loading, isEntitled, refresh } = useAuthContext()
    const location = useLocation()

    useEffect(() => {
        if (location.hash === "#plans") {
            document.getElementById("plans")?.scrollIntoView({ behavior: "smooth", block: "start" })
        }
    }, [location.hash])

    if (loading || !auth?.authenticated) {
        return (
            <div className="pf-center">
                <Spinner label="Loading…" />
            </div>
        )
    }

    const entitled = isEntitled
    const planId = auth.planId
    const checkoutUrls = resolvePlanCheckoutUrls(auth.checkoutUrls)
    const showPlans = showsPaidPlanOptions(planId)
    const customerPortalUrl = auth.customerPortalUrl?.trim() || null
    const showBillingPortal = showsManageBilling(planId) && Boolean(customerPortalUrl)

    const handleSignOut = async () => {
        await logout()
        await refresh()
    }

    return (
        <AppShell title="Profile" subtitle={profileSubtitle(planId, entitled)}>
            <SubscriptionCancelBanner auth={auth} />

            <section className="pf-profile-section">
                <PlanUsagePanel
                    auth={auth}
                    onRefresh={refresh}
                    onSignOut={() => void handleSignOut()}
                />
            </section>

            {showPlans ? (
                <section id="plans" className="pf-profile-section pf-subscribe-plans">
                    <h2 className="pf-subscribe-plans-title">Subscribe</h2>
                    <PricingPlans checkoutUrls={checkoutUrls} />
                </section>
            ) : null}

            <div className="pf-subscribe-actions">
                <Button variant="ghost" onClick={() => void refresh()}>
                    Refresh status
                </Button>
                {showBillingPortal ? (
                    <ButtonLink href={customerPortalUrl!} variant="secondary">
                        Open billing portal
                    </ButtonLink>
                ) : null}
                {entitled ? (
                    <Link className={buttonClass("primary")} to={ROUTES.home}>
                        Go to projects
                    </Link>
                ) : (
                    <Link className={buttonClass("ghost")} to={ROUTES.home}>
                        Back to projects
                    </Link>
                )}
            </div>
        </AppShell>
    )
}
