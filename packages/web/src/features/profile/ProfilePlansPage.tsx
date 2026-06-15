import { useEffect, useState } from "react"
import { Link, useLocation, useSearchParams } from "react-router-dom"
import { PRODUCT_NAME } from "../../components/brand"
import { useAuthContext } from "../../app/AuthContext"
import { ROUTES } from "../../constants/routes"
import { logout } from "../../lib/api"
import { AppShell } from "../../components/layout"
import { showsManageBilling, showsPaidPlanOptions, resolvePlanCheckoutUrls } from "../auth/plans"
import { PlanUsagePanel } from "../auth/PlanUsagePanel"
import { SubscriptionCancelBanner } from "../auth/SubscriptionCancelBanner"
import { PricingPlans } from "../auth/PricingPlans"
import { ProfileSupportSection } from "./ProfileSupportSection"
import { Button, buttonClass, Spinner } from "../../components/ui"
import { PendingCheckoutRecovery } from "../auth/PendingCheckoutRecovery"
import { BillingPortalButton } from "../auth/BillingPortalButton"

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
    const [searchParams, setSearchParams] = useSearchParams()
    const [showBillingSuccess, setShowBillingSuccess] = useState(
        () => searchParams.get("billing") === "success"
    )

    useEffect(() => {
        if (!showBillingSuccess) return
        const next = new URLSearchParams(searchParams)
        next.delete("billing")
        setSearchParams(next, { replace: true })
    }, [showBillingSuccess, searchParams, setSearchParams])

    useEffect(() => {
        if (location.hash === "#plans") {
            document.getElementById("plans")?.scrollIntoView({ behavior: "smooth", block: "start" })
        }
        if (location.hash === "#support") {
            document.getElementById("support")?.scrollIntoView({ behavior: "smooth", block: "start" })
        }
    }, [location.hash])

    useEffect(() => {
        if (!auth?.hasPendingCheckout) return
        const onVisible = () => {
            if (document.visibilityState === "visible") {
                void refresh()
            }
        }
        document.addEventListener("visibilitychange", onVisible)
        return () => document.removeEventListener("visibilitychange", onVisible)
    }, [auth?.hasPendingCheckout, refresh])

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
    const showBillingPortal =
        showsManageBilling(planId) && (Boolean(auth.portalUsesApi) || Boolean(customerPortalUrl))

    const handleSignOut = async () => {
        await logout()
        await refresh()
    }

    return (
        <AppShell title="Profile" subtitle={profileSubtitle(planId, entitled)}>
            {showBillingSuccess ? (
                <p className="pf-muted pf-billing-success-note" role="status">
                    Checkout complete — click <strong>Refresh status</strong> if your project seats have
                    not updated yet.
                </p>
            ) : null}
            <SubscriptionCancelBanner auth={auth} />

            {auth.hasPendingCheckout ? (
                <section className="pf-profile-section">
                    <PendingCheckoutRecovery
                        projectsInUse={auth.usage?.projectCount ?? 1}
                        initialQuantity={auth.pendingCheckoutQuantity}
                        onSuccess={refresh}
                    />
                </section>
            ) : null}

            <section className="pf-profile-section">
                <PlanUsagePanel
                    auth={auth}
                    onRefresh={refresh}
                    onSignOut={() => void handleSignOut()}
                />
            </section>

            {showPlans ? (
                <section id="plans" className="pf-profile-section">
                    <h2 className="pf-profile-section-title">Subscribe</h2>
                    <PricingPlans
                        checkoutUrls={checkoutUrls}
                        checkoutUsesApi={Boolean(auth.checkoutUsesApi)}
                        initialQuantity={Math.max(1, auth.usage?.projectCount ?? 1)}
                        minQuantity={Math.max(1, auth.usage?.projectCount ?? 1)}
                    />
                </section>
            ) : null}

            <section className="pf-profile-section">
                <div className="pf-subscribe-actions">
                    <Button variant="ghost" onClick={() => void refresh()}>
                        Refresh status
                    </Button>
                    {showBillingPortal ? (
                        <BillingPortalButton
                            portalUrl={customerPortalUrl}
                            portalUsesApi={Boolean(auth.portalUsesApi)}
                            variant="secondary"
                        >
                            Open billing portal
                        </BillingPortalButton>
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
            </section>

            <ProfileSupportSection />
        </AppShell>
    )
}
