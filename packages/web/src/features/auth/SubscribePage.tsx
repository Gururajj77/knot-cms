import { Link } from "react-router-dom"
import { useAuthContext } from "../../app/AuthContext"
import { ROUTES } from "../../constants/routes"
import { logout } from "../../lib/api"
import { AuthLayout } from "../../components/layout"
import { Badge, Button, ButtonLink, Card, Spinner } from "../../components/ui"

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
    const checkoutUrl = auth.checkoutUrl
    const entitled = isEntitled

    return (
        <AuthLayout
            title={entitled ? "Subscription" : "Subscribe"}
            subtitle={
                entitled ? (
                    <>
                        Your account <strong>{email}</strong> has an active PublishFlow subscription.
                    </>
                ) : (
                    <>
                        <strong>{email}</strong> needs an active subscription to use PublishFlow. Use the same
                        email at checkout as your Google account.
                    </>
                )
            }
        >
            <Card className="pf-subscribe-card">
                <div className="pf-subscribe-status">
                    <span className="pf-muted">Status</span>
                    <Badge tone={entitled ? "ok" : "warn"}>
                        {subscriptionLabel(auth.subscriptionStatus, entitled)}
                    </Badge>
                </div>

                {entitled ? (
                    <>
                        <p className="pf-muted pf-subscribe-note">
                            You can create projects, sync to Framer, and use auto-sync. Billing changes are
                            managed through Polar.
                        </p>
                        <div className="pf-actions pf-actions--footer">
                            <Link className="pf-btn pf-btn--primary" to={ROUTES.home}>
                                Back to projects
                            </Link>
                            {checkoutUrl ? (
                                <ButtonLink href={checkoutUrl} variant="secondary">
                                    Open Polar checkout
                                </ButtonLink>
                            ) : null}
                        </div>
                    </>
                ) : checkoutUrl ? (
                    <>
                        <ButtonLink href={checkoutUrl} variant="primary">
                            Subscribe now
                        </ButtonLink>
                        <p className="pf-muted pf-subscribe-note">
                            After checkout, return here and refresh — or sign out and sign in again.
                        </p>
                        <Button variant="ghost" onClick={() => void refresh()}>
                            Refresh status
                        </Button>
                    </>
                ) : (
                    <p className="pf-muted">Checkout URL is not configured yet.</p>
                )}

                <Button variant="ghost" onClick={() => void logout().then(() => window.location.reload())}>
                    Sign out
                </Button>
            </Card>
        </AuthLayout>
    )
}
