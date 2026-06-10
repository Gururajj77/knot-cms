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
    const { isAuthenticated, isEntitled } = useAuthContext()

    return (
        <AuthLayout
            wide
            title="You're subscribed"
            subtitle={`Thanks for supporting ${PRODUCT_NAME}. One more step to start syncing Notion → Framer.`}
        >
            <div className="pf-success-icon-wrap" aria-hidden>
                <CheckCircle2 size={40} strokeWidth={1.75} />
            </div>

            <ol className="pf-success-steps">
                <li className="pf-success-step pf-success-step--done">
                    <span className="pf-success-step-marker">1</span>
                    <div>
                        <strong>Payment confirmed</strong>
                        <p>Your subscription is active with Polar.</p>
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
                    className={`pf-success-step${!isAuthenticated ? "" : isEntitled ? " pf-success-step--done" : " pf-success-step--current"}`}
                >
                    <span className="pf-success-step-marker">{isAuthenticated ? "2" : "3"}</span>
                    <div>
                        <strong>{isEntitled ? "You're all set" : "Activate your account"}</strong>
                        <p>
                            {isEntitled
                                ? "Head to your projects dashboard and connect Notion."
                                : "Open Plan & usage and click Refresh status if your plan hasn't updated yet."}
                        </p>
                    </div>
                </li>
            </ol>

            <div className="pf-success-actions">
                {!isAuthenticated ? (
                    <GoogleSignInButton returnTo={ROUTES.subscribe} />
                ) : isEntitled ? (
                    <Link className={buttonClass("primary")} to={ROUTES.home}>
                        Go to projects
                    </Link>
                ) : (
                    <Link className={buttonClass("primary")} to={ROUTES.subscribe}>
                        Open Plan & usage
                    </Link>
                )}
                {isAuthenticated ? (
                    <Link className={buttonClass("ghost")} to={ROUTES.subscribe}>
                        View plan & usage
                    </Link>
                ) : (
                    <Link className={buttonClass("ghost")} to={ROUTES.subscribe}>
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
