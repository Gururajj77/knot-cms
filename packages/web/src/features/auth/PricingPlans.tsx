import { PRICE_PER_PROJECT_MONTHLY_USD } from "@knotcms/shared"
import { Check } from "lucide-react"
import { ButtonLink } from "../../components/ui"
import { PAID_PLAN, resolvePlanCheckoutUrls, type PlanCheckoutUrls } from "./plans"

interface PricingPlansProps {
    checkoutUrls: PlanCheckoutUrls
}

export function PricingPlans({ checkoutUrls }: PricingPlansProps) {
    const plan = PAID_PLAN
    const checkoutUrl = resolvePlanCheckoutUrls(checkoutUrls).paid
    const price = plan.pricePerProjectMonthlyUsd ?? PRICE_PER_PROJECT_MONTHLY_USD

    return (
        <div className="pf-pricing">
            <div className="pf-pricing-grid pf-pricing-grid--single">
                <article className="pf-plan-card pf-plan-card--featured">
                    <span className="pf-plan-badge">Per project</span>
                    <h2 className="pf-plan-name">{plan.name}</h2>
                    <p className="pf-plan-tagline">{plan.tagline}</p>
                    <p className="pf-plan-price">
                        <strong>${price}</strong>
                        <span className="pf-plan-price-unit"> / project / month</span>
                    </p>
                    <p className="pf-muted pf-plan-quantity-hint">
                        Choose how many projects you need at checkout — 1, 10, 100, or any
                        quantity. Change anytime in Polar.
                    </p>
                    <ul className="pf-plan-features">
                        {plan.marketingFeatures.map(feature => (
                            <li key={feature}>
                                <Check size={14} strokeWidth={2} aria-hidden />
                                {feature}
                            </li>
                        ))}
                    </ul>
                    {checkoutUrl ? (
                        <ButtonLink href={checkoutUrl} variant="primary" className="pf-plan-cta">
                            Subscribe
                        </ButtonLink>
                    ) : (
                        <p className="pf-muted pf-plan-unavailable">
                            Add <code>BILLING_CHECKOUT_URL_PAID</code> in worker secrets to enable
                            checkout.
                        </p>
                    )}
                </article>
            </div>
            {checkoutUrl ? (
                <p className="pf-muted pf-pricing-footnote">
                    Use the same Google email at checkout. After payment, click Refresh status on
                    your profile.
                </p>
            ) : null}
        </div>
    )
}
