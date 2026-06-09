import { Link } from "react-router-dom"
import { useAuthContext } from "../../app/AuthContext"
import { ROUTES } from "../../constants/routes"
import { logout } from "../../lib/api"
import { SubscribeLayout } from "../../components/layout/SubscribeLayout"
import { Badge, Button, Card, Spinner } from "../../components/ui"
import { PLANS, resolvePlanCheckoutUrls } from "./plans"
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
        <SubscribeLayout
            title={entitled ? "Your subscription" : "Choose a plan"}
            subtitle={
                entitled ? (
                    <>
                        Signed in as <strong>{email}</strong>. Your PublishFlow subscription is active.
                    </>
                ) : (
                    <>
                        Signed in as <strong>{email}</strong>. Pick Pro or Max to start syncing — use this
                        same email at checkout.
                    </>
                )
            }
        >
            <div className="pf-subscribe-account">
                <span className="pf-muted">Account</span>
                <span>{email}</span>
                <Badge tone={entitled ? "ok" : "warn"}>
                    {subscriptionLabel(auth.subscriptionStatus, entitled)}
                </Badge>
            </div>

            {entitled ? (
                <Card className="pf-subscribe-active-card">
                    <p className="pf-subscribe-active-lead">
                        You can create and manage sync projects. Plan limits apply per account.
                    </p>
                    <ul className="pf-plan-features pf-plan-features--compact">
                        {PLANS.map(plan => (
                            <li key={plan.id}>
                                <strong>{plan.name}</strong> — up to {plan.projectLimit}{" "}
                                {plan.projectLimit === 1 ? "project" : "projects"}
                            </li>
                        ))}
                    </ul>
                    <div className="pf-subscribe-active-actions">
                        <Link className="pf-btn pf-btn--primary" to={ROUTES.home}>
                            Go to projects
                        </Link>
                        <Button variant="ghost" onClick={() => void refresh()}>
                            Refresh status
                        </Button>
                    </div>
                </Card>
            ) : (
                <>
                    <PricingPlans checkoutUrls={checkoutUrls} />
                    <div className="pf-subscribe-actions">
                        <Button variant="ghost" onClick={() => void refresh()}>
                            Already subscribed? Refresh status
                        </Button>
                        <Button variant="ghost" onClick={() => void logout().then(() => window.location.reload())}>
                            Sign out
                        </Button>
                    </div>
                </>
            )}
        </SubscribeLayout>
    )
}
