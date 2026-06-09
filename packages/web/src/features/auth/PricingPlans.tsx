import { Check } from "lucide-react"
import { ButtonLink } from "../../components/ui"
import { checkoutUrlForPlan, PLANS, type PlanCheckoutUrls } from "./plans"

interface PricingPlansProps {
    checkoutUrls: PlanCheckoutUrls
}

export function PricingPlans({ checkoutUrls }: PricingPlansProps) {
    const hasCheckout = Boolean(checkoutUrls.pro || checkoutUrls.max)

    return (
        <div className="pf-pricing">
            <div className="pf-pricing-grid">
                {PLANS.map(plan => {
                    const checkoutUrl = checkoutUrlForPlan(checkoutUrls, plan.id)
                    return (
                        <article
                            key={plan.id}
                            className={`pf-plan-card${plan.featured ? " pf-plan-card--featured" : ""}`}
                        >
                            {plan.featured ? <span className="pf-plan-badge">Popular</span> : null}
                            <h2 className="pf-plan-name">{plan.name}</h2>
                            <p className="pf-plan-tagline">{plan.tagline}</p>
                            <p className="pf-plan-limit">
                                <strong>{plan.projectLimit}</strong>{" "}
                                {plan.projectLimit === 1 ? "project" : "projects"}
                            </p>
                            <ul className="pf-plan-features">
                                {plan.features.map(feature => (
                                    <li key={feature}>
                                        <Check size={14} strokeWidth={2} aria-hidden />
                                        {feature}
                                    </li>
                                ))}
                            </ul>
                            {checkoutUrl ? (
                                <ButtonLink
                                    href={checkoutUrl}
                                    variant={plan.featured ? "primary" : "secondary"}
                                    className="pf-plan-cta"
                                >
                                    Get {plan.name}
                                </ButtonLink>
                            ) : (
                                <p className="pf-muted pf-plan-unavailable">Checkout not configured</p>
                            )}
                        </article>
                    )
                })}
            </div>
            {!hasCheckout ? (
                <p className="pf-muted pf-pricing-footnote">
                    Add <code>BILLING_CHECKOUT_URL</code> in worker secrets to enable checkout.
                </p>
            ) : (
                <p className="pf-muted pf-pricing-footnote">
                    Use the same Google email at checkout. After payment, refresh this page or sign in again.
                </p>
            )}
        </div>
    )
}
