import { Check } from "lucide-react"
import { ButtonLink } from "../../components/ui"
import {
    checkoutUrlForPlan,
    UI_CHECKOUT_PLANS,
    type CheckoutPlanId,
    type PlanCheckoutUrls,
    type PlanDefinition,
} from "./plans"

interface PricingPlansProps {
    checkoutUrls: PlanCheckoutUrls
    plans?: PlanDefinition[]
    /** Marks the card for the customer's current paid tier (pro / max). */
    currentPlanId?: string
}

export function PricingPlans({
    checkoutUrls,
    plans = UI_CHECKOUT_PLANS,
    currentPlanId,
}: PricingPlansProps) {
    const hasCheckout = plans.some(
        plan =>
            plan.id !== currentPlanId &&
            Boolean(checkoutUrlForPlan(checkoutUrls, plan.id as CheckoutPlanId))
    )

    return (
        <div className="pf-pricing">
            <div className="pf-pricing-grid">
                {plans.map(plan => {
                    const isCurrent = currentPlanId === plan.id
                    const checkoutUrl = checkoutUrlForPlan(checkoutUrls, plan.id as CheckoutPlanId)
                    return (
                        <article
                            key={plan.id}
                            className={`pf-plan-card${plan.featured ? " pf-plan-card--featured" : ""}${isCurrent ? " pf-plan-card--current" : ""}`}
                        >
                            {isCurrent ? (
                                <span className="pf-plan-badge pf-plan-badge--current">Current plan</span>
                            ) : plan.featured ? (
                                <span className="pf-plan-badge">Popular</span>
                            ) : null}
                            <h2 className="pf-plan-name">{plan.name}</h2>
                            <p className="pf-plan-tagline">{plan.tagline}</p>
                            <p className="pf-plan-limit">
                                <strong>{plan.projectLimit}</strong>{" "}
                                {plan.projectLimit === 1 ? "project" : "projects"}
                            </p>
                            <ul className="pf-plan-features">
                                {plan.marketingFeatures.map(feature => (
                                    <li key={feature}>
                                        <Check size={14} strokeWidth={2} aria-hidden />
                                        {feature}
                                    </li>
                                ))}
                            </ul>
                            {isCurrent ? (
                                <p className="pf-muted pf-plan-unavailable">You&apos;re on this plan</p>
                            ) : checkoutUrl ? (
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
                    Add <code>BILLING_CHECKOUT_URL_PRO</code> and{" "}
                    <code>BILLING_CHECKOUT_URL_MAX</code> in worker secrets to enable checkout.
                </p>
            ) : (
                <p className="pf-muted pf-pricing-footnote">
                    Use the same Google email at checkout. After payment, click Refresh status below.
                </p>
            )}
        </div>
    )
}
