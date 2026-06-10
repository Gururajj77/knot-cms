import { useEffect } from "react"
import { Link, useLocation } from "react-router-dom"
import { PRODUCT_NAME } from "../../components/brand"
import { useAuthContext } from "../../app/AuthContext"
import { ROUTES } from "../../constants/routes"
import { AppShell } from "../../components/layout"
import { Badge, Button, Spinner, buttonClass } from "../../components/ui"
import { resolvePlanCheckoutUrls, showsPaidPlanOptions } from "./plans"
import { PlanUsagePanel } from "./PlanUsagePanel"
import { PricingPlans } from "./PricingPlans"

function subscriptionLabel(status: string | undefined, entitled: boolean): string {
    if (entitled) return "Active"
    if (status === "canceled" || status === "revoked") return "Canceled"
    if (status === "past_due") return "Past due"
    return "Inactive"
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
    const checkoutUrls = resolvePlanCheckoutUrls(auth.checkoutUrls)
    const showPlans = showsPaidPlanOptions(auth.planId)

    return (
        <AppShell
            title="Plan & usage"
            subtitle={
                entitled
                    ? `Your ${PRODUCT_NAME} limits and features.`
                    : `Subscribe to Pro to use ${PRODUCT_NAME} — use the same email at checkout.`
            }
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
                    <h2 className="pf-subscribe-plans-title">
                        {entitled ? "Upgrade plan" : "Choose a plan"}
                    </h2>
                    <PricingPlans
                        checkoutUrls={checkoutUrls}
                        currentPlanId={entitled ? auth.planId : undefined}
                    />
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
