import { useEffect, useState } from "react"
import { Check, Minus, Plus } from "lucide-react"
import { PRICE_PER_PROJECT_MONTHLY_USD } from "@knotcms/shared"
import { completePendingCheckout } from "../../lib/api/billing"
import { Button } from "../../components/ui"
import { PAID_PLAN } from "./plans"

const MAX_CHECKOUT_QUANTITY = 100

interface PendingCheckoutRecoveryProps {
    projectsInUse: number
    initialQuantity?: number | null
    onSuccess?: () => void | Promise<void>
}

function formatUsd(amount: number): string {
    return amount.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
    })
}

export function PendingCheckoutRecovery({
    projectsInUse,
    initialQuantity,
    onSuccess,
}: PendingCheckoutRecoveryProps) {
    const minSeats = Math.max(1, projectsInUse)
    const [quantity, setQuantity] = useState(Math.max(minSeats, initialQuantity ?? minSeats))
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [feedback, setFeedback] = useState<string | null>(null)

    const price = PAID_PLAN.pricePerProjectMonthlyUsd ?? PRICE_PER_PROJECT_MONTHLY_USD
    const estimatedMonthly = quantity * price

    useEffect(() => {
        if (typeof initialQuantity !== "number" || initialQuantity < minSeats) return
        setQuantity(initialQuantity)
    }, [initialQuantity, minSeats])

    const setSeats = (next: number) => {
        setQuantity(Math.min(MAX_CHECKOUT_QUANTITY, Math.max(minSeats, next)))
        setError(null)
        setFeedback(null)
    }

    const handleContinueCheckout = async () => {
        setLoading(true)
        setError(null)
        setFeedback(null)
        try {
            const result = await completePendingCheckout(quantity)
            window.open(result.url, "_blank", "noopener,noreferrer")
            setFeedback("Checkout opened in a new tab. Complete payment there to restore your plan.")
            await onSuccess?.()
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not start checkout")
        } finally {
            setLoading(false)
        }
    }

    return (
        <article className="pf-plan-card pf-plan-card--featured pf-plan-card--subscribe pf-pending-checkout-recovery">
            <div className="pf-usage-billing-split pf-subscribe-plan-split">
                <div className="pf-usage-billing-copy-col pf-subscribe-plan-copy">
                    <span className="pf-plan-badge pf-plan-badge--inline">Finish your plan change</span>
                    <h2 className="pf-plan-name">Complete checkout for your new plan</h2>
                    <p className="pf-plan-tagline">
                        Your previous plan was cancelled before checkout finished.
                    </p>
                    <p className="pf-plan-price">
                        <strong>${price}</strong>
                        <span className="pf-plan-price-unit"> / project / month</span>
                    </p>
                    <p className="pf-muted pf-plan-quantity-hint">
                        Pick how many projects you need, then continue checkout with the same Google
                        email — no need to cancel again.
                    </p>
                    <ul className="pf-plan-features pf-plan-features--subscribe">
                        {PAID_PLAN.marketingFeatures.map(feature => (
                            <li key={feature}>
                                <Check size={14} strokeWidth={2} aria-hidden />
                                {feature}
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="pf-usage-billing-action-col pf-subscribe-plan-checkout">
                    <div className="pf-subscribe-checkout-wrap">
                        <div className="pf-subscribe-checkout pf-subscribe-checkout--profile">
                            <div className="pf-subscribe-checkout-bottom">
                                <div className="pf-subscribe-checkout-controls">
                                    <div className="pf-seat-estimate">
                                        <span className="pf-seat-estimate-label">
                                            Projects at checkout
                                        </span>
                                        <div className="pf-seat-estimate-counter pf-seat-estimate-counter--prominent">
                                            <button
                                                type="button"
                                                className="pf-seat-estimate-btn"
                                                onClick={() => setSeats(quantity - 1)}
                                                disabled={quantity <= minSeats || loading}
                                                aria-label="Decrease projects"
                                            >
                                                <Minus size={18} aria-hidden />
                                            </button>
                                            <input
                                                type="number"
                                                className="pf-seat-estimate-input"
                                                min={minSeats}
                                                max={MAX_CHECKOUT_QUANTITY}
                                                value={quantity}
                                                onChange={e =>
                                                    setSeats(
                                                        Number.parseInt(e.target.value, 10) ||
                                                            minSeats
                                                    )
                                                }
                                                disabled={loading}
                                                aria-label="Number of projects"
                                            />
                                            <button
                                                type="button"
                                                className="pf-seat-estimate-btn"
                                                onClick={() => setSeats(quantity + 1)}
                                                disabled={
                                                    quantity >= MAX_CHECKOUT_QUANTITY || loading
                                                }
                                                aria-label="Increase projects"
                                            >
                                                <Plus size={18} aria-hidden />
                                            </button>
                                        </div>
                                    </div>
                                    <p className="pf-seat-estimate-formula pf-muted">
                                        {formatUsd(price)} × {quantity} project
                                        {quantity === 1 ? "" : "s"} = {formatUsd(estimatedMonthly)}
                                        /mo (excl. taxes)
                                    </p>
                                </div>
                                <div className="pf-subscribe-checkout-footer">
                                    <Button
                                        variant="primary"
                                        className="pf-plan-cta"
                                        onClick={() => void handleContinueCheckout()}
                                        disabled={loading}
                                    >
                                        {loading ? "Opening checkout…" : "Continue checkout"}
                                    </Button>
                                    {feedback ? (
                                        <p className="pf-seat-change-option-feedback">{feedback}</p>
                                    ) : null}
                                    {error ? (
                                        <p className="pf-usage-meter-hint pf-usage-meter-hint--warn">
                                            {error}
                                        </p>
                                    ) : null}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </article>
    )
}
