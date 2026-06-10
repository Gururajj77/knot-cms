import { useEffect } from "react"
import { Link, useLocation } from "react-router-dom"
import { PRODUCT_NAME } from "../../components/brand"
import { useAuthContext } from "../../app/AuthContext"
import { ROUTES } from "../../constants/routes"
import { AppShell } from "../../components/layout"
import { Badge, Button, ButtonLink, Card, Spinner, buttonClass } from "../../components/ui"
import { resolvePlanCheckoutUrls, showsManageBilling, showsPaidPlanOptions } from "./plans"
import { PlanUsagePanel } from "./PlanUsagePanel"
import { PricingPlans } from "./PricingPlans"

function subscriptionLabel(status: string | undefined, entitled: boolean): string {
    if (entitled) return "Active"
    if (status === "canceled" || status === "revoked") return "Canceled"
    if (status === "past_due") return "Past due"
    return "Inactive"
}

function subscribeSubtitle(planId: string | undefined, entitled: boolean): string {
    if (showsManageBilling(planId)) {
        return entitled
            ? `Your ${PRODUCT_NAME} limits and features.`
            : `Your subscription is inactive. Manage billing to renew or update payment.`
    }
    return `Pick Pro or Max to unlock ${PRODUCT_NAME} — use the same email at checkout.`
}

export function SubscribePage() {
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

    const email = auth.email ?? ""
    const entitled = isEntitled
    const planId = auth.planId
    const checkoutUrls = resolvePlanCheckoutUrls(auth.checkoutUrls)
    const customerPortalUrl = auth.customerPortalUrl?.trim() || null
    const showPlans = showsPaidPlanOptions(planId)
    const showBilling = showsManageBilling(planId)

    return (
        <AppShell
            title="Plan & usage"
            subtitle={subscribeSubtitle(planId, entitled)}
            email={email}
            onLogout={refresh}
        >
            <div className="pf-subscribe-account">
                <span className="pf-muted">Account</span>
                <span>{email}</span>
                <Badge tone={entitled ? "ok" : "warn"}>
                    {subscriptionLabel(auth.subscriptionStatus, entitled)}
                </Badge>
            </div>

            {entitled ? <PlanUsagePanel auth={auth} onRefresh={refresh} /> : null}

            {showPlans ? (
                <section id="plans" className="pf-subscribe-plans">
                    <h2 className="pf-subscribe-plans-title">Choose a plan</h2>
                    <PricingPlans checkoutUrls={checkoutUrls} />
                </section>
            ) : null}

            {showBilling ? (
                <section className="pf-subscribe-plans">
                    <Card className="pf-subscribe-active-card">
                        <h2 className="pf-subscribe-plans-title">Billing</h2>
                        <p className="pf-subscribe-active-lead">
                            Change plan, update your payment method, view invoices, or cancel your
                            subscription in Polar.
                        </p>
                        <div className="pf-subscribe-active-actions">
                            {customerPortalUrl ? (
                                <ButtonLink href={customerPortalUrl} variant="primary">
                                    Manage subscription
                                </ButtonLink>
                            ) : (
                                <p className="pf-muted">
                                    Add <code>BILLING_CUSTOMER_PORTAL_URL</code> in worker secrets to
                                    enable billing management.
                                </p>
                            )}
                        </div>
                    </Card>
                </section>
            ) : null}

            <div className="pf-subscribe-actions">
                <Button variant="ghost" onClick={() => void refresh()}>
                    Refresh status
                </Button>
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
