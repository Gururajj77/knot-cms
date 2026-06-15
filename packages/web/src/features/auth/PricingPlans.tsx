import { PRICE_PER_PROJECT_MONTHLY_USD } from "@knotcms/shared"
import { Check } from "lucide-react"
import { PAID_PLAN, resolvePlanCheckoutUrls, type PlanCheckoutUrls } from "./plans"
import { SubscribeCheckoutCta } from "./SubscribeCheckoutCta"

interface PricingPlansProps {
    checkoutUrls: PlanCheckoutUrls
    checkoutUsesApi?: boolean
    initialQuantity?: number
    minQuantity?: number
}

export function PricingPlans({
    checkoutUrls,
    checkoutUsesApi = false,
    initialQuantity = 1,
    minQuantity = 1,
}: PricingPlansProps) {
    const plan = PAID_PLAN
    const checkoutUrl = resolvePlanCheckoutUrls(checkoutUrls).paid
    const price = plan.pricePerProjectMonthlyUsd ?? PRICE_PER_PROJECT_MONTHLY_USD
    const checkoutReady = checkoutUsesApi || Boolean(checkoutUrl)
    const billingHint = checkoutUsesApi
        ? "Pick how many projects you need, then complete checkout with the same Google email."
        : "Choose how many projects you need at checkout — 1, 10, 100, or any quantity. Change anytime in your billing portal."

    return (
        <div className="pf-pricing pf-pricing--profile">
            <article className="pf-plan-card pf-plan-card--featured pf-plan-card--subscribe">
                <div className="pf-usage-billing-split pf-subscribe-plan-split">
                    <div className="pf-usage-billing-copy-col pf-subscribe-plan-copy">
                        <span className="pf-plan-badge pf-plan-badge--inline">Per project</span>
                        <h2 className="pf-plan-name">{plan.name}</h2>
                        <p className="pf-plan-tagline">{plan.tagline}</p>
                        <p className="pf-plan-price">
                            <strong>${price}</strong>
                            <span className="pf-plan-price-unit"> / project / month</span>
                        </p>
                        <p className="pf-muted pf-plan-quantity-hint">{billingHint}</p>
                        <ul className="pf-plan-features pf-plan-features--subscribe">
                            {plan.marketingFeatures.map(feature => (
                                <li key={feature}>
                                    <Check size={14} strokeWidth={2} aria-hidden />
                                    {feature}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="pf-usage-billing-action-col pf-subscribe-plan-checkout">
                        <SubscribeCheckoutCta
                            checkoutUrl={checkoutUrl}
                            checkoutUsesApi={checkoutUsesApi}
                            initialQuantity={initialQuantity}
                            minQuantity={minQuantity}
                            label="Subscribe with selected projects"
                            profileLayout
                        />
                    </div>
                </div>
            </article>
            {checkoutReady ? (
                <p className="pf-muted pf-pricing-footnote pf-pricing-footnote--profile">
                    Use the same Google email at checkout. After payment, click Refresh status on
                    your profile.
                </p>
            ) : null}
        </div>
    )
}
