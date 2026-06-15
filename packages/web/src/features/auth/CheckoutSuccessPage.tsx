import { CheckCircle2 } from "lucide-react"
import { Link, useSearchParams } from "react-router-dom"
import { PRODUCT_NAME } from "../../components/brand"
import { useAuthContext } from "../../app/AuthContext"
import { ROUTES } from "../../constants/routes"
import { AuthLayout } from "../../components/layout"
import { buttonClass } from "../../components/ui"
import { GoogleSignInButton } from "./GoogleSignInButton"

function checkoutIdFromSearch(params: URLSearchParams): string | null {
    return params.get("checkout_id")?.trim() || params.get("checkoutId")?.trim() || null
}

export function CheckoutSuccessPage() {
    const [params] = useSearchParams()
    const checkoutId = checkoutIdFromSearch(params)
    const { isAuthenticated, hasPaidSubscription } = useAuthContext()

    return (
        <AuthLayout
            wide
            title="You're subscribed"
            subtitle={`Thanks for supporting ${PRODUCT_NAME}. One more step to start syncing to Framer.`}
        >
            <div className="pf-success-icon-wrap" aria-hidden>
                <CheckCircle2 size={40} strokeWidth={1.75} />
            </div>

            <ol className="pf-success-steps">
                <li className="pf-success-step pf-success-step--done">
                    <span className="pf-success-step-marker">1</span>
                    <div>
                        <strong>Payment confirmed</strong>
                        <p>Your subscription payment was confirmed.</p>
                    </div>
                </li>
                {!isAuthenticated ? (
                    <li className="pf-success-step pf-success-step--current">
                        <span className="pf-success-step-marker">2</span>
                        <div>
                            <strong>Sign in with Google</strong>
                            <p>Use the same email address you entered at checkout.</p>
                        </div>
                    </li>
                ) : null}
                <li
                    className={`pf-success-step${!isAuthenticated ? "" : hasPaidSubscription ? " pf-success-step--done" : " pf-success-step--current"}`}
                >
                    <span className="pf-success-step-marker">{isAuthenticated ? "2" : "3"}</span>
                    <div>
                        <strong>{hasPaidSubscription ? "You're all set" : "Activate your account"}</strong>
                        <p>
                            {hasPaidSubscription
                                ? "Head to your projects dashboard and connect Notion."
                                : "Open Profile and click Refresh status if your plan hasn't updated yet."}
                        </p>
                    </div>
                </li>
            </ol>

            <div className="pf-success-actions">
                {!isAuthenticated ? (
                    <GoogleSignInButton returnTo={ROUTES.profilePlans} />
                ) : hasPaidSubscription ? (
                    <Link className={buttonClass("primary")} to={ROUTES.home}>
                        Go to projects
                    </Link>
                ) : (
                    <Link className={buttonClass("primary")} to={ROUTES.profilePlans}>
                        Open profile
                    </Link>
                )}
                {isAuthenticated ? (
                    <Link className={buttonClass("ghost")} to={ROUTES.profilePlans}>
                        View profile
                    </Link>
                ) : (
                    <Link className={buttonClass("ghost")} to={ROUTES.profilePlans}>
                        Already signed in?
                    </Link>
                )}
            </div>

            {checkoutId ? (
                <p className="pf-success-reference">
                    Reference: <code>{checkoutId}</code>
                </p>
            ) : null}
        </AuthLayout>
    )
}
