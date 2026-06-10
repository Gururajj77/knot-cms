import { Link } from "react-router-dom"
import { PRODUCT_NAME } from "../../components/brand"
import { useAuthContext } from "../../app/AuthContext"
import { ROUTES } from "../../constants/routes"
import { AppShell } from "../../components/layout"
import { Badge, Button, Spinner, buttonClass } from "../../components/ui"
import { resolvePlanCheckoutUrls } from "./plans"
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

    if (loading || !auth?.authenticated) {
        return (
            <div className="pf-center">
                <Spinner label="Loading…" />
            </div>
        )
    }

    const email = auth.email ?? ""
    const entitled = isEntitled
    const checkoutUrls = resolvePlanCheckoutUrls(auth.checkoutUrl)

    return (
        <AppShell
            title={entitled ? "Plan & usage" : "Choose a plan"}
            subtitle={
                entitled
                    ? `Your ${PRODUCT_NAME} limits and features for this account.`
                    : "Pick Pro or Max to unlock paid features — use the same email at checkout."
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

            {entitled ? (
                <PlanUsagePanel auth={auth} onRefresh={refresh} />
            ) : (
                <>
                    <PricingPlans checkoutUrls={checkoutUrls} />
                    <p className="pf-pricing-footnote pf-muted">
                        After you subscribe, this page shows your plan usage — projects, syncs remaining,
                        and included features.
                    </p>
                    <div className="pf-subscribe-actions">
                        <Button variant="ghost" onClick={() => void refresh()}>
                            Already subscribed? Refresh status
                        </Button>
                        <Link className={buttonClass("ghost")} to={ROUTES.home}>
                            Back to projects
                        </Link>
                    </div>
                </>
            )}
        </AppShell>
    )
}
