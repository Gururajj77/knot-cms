import { useState } from "react"
import { Minus, Plus } from "lucide-react"
import {
    MAX_CHECKOUT_PROJECT_QUANTITY,
    MIN_CHECKOUT_PROJECT_QUANTITY,
    PRICE_PER_PROJECT_MONTHLY_USD,
} from "@knotcms/shared"
import { createBillingCheckout } from "../../lib/api/billing"
import { Button, ButtonLink } from "../../components/ui"

function formatUsd(amount: number): string {
    return amount.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
}

interface SubscribeCheckoutCtaProps {
    checkoutUrl: string | null
    checkoutUsesApi: boolean
    className?: string
    buttonClassName?: string
    initialQuantity?: number
    minQuantity?: number
    label?: string
    profileLayout?: boolean
}

export function SubscribeCheckoutCta({
    checkoutUrl,
    checkoutUsesApi,
    className,
    buttonClassName = "pf-plan-cta",
    initialQuantity = 1,
    minQuantity = MIN_CHECKOUT_PROJECT_QUANTITY,
    label = "Subscribe",
    profileLayout = false,
}: SubscribeCheckoutCtaProps) {
    const [quantity, setQuantity] = useState(initialQuantity)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const clampedMin = Math.max(MIN_CHECKOUT_PROJECT_QUANTITY, minQuantity)
    const estimatedMonthly = quantity * PRICE_PER_PROJECT_MONTHLY_USD

    const setSeats = (next: number) => {
        const clamped = Math.min(
            MAX_CHECKOUT_PROJECT_QUANTITY,
            Math.max(clampedMin, next)
        )
        setQuantity(clamped)
        setError(null)
    }

    const handleApiCheckout = async () => {
        setLoading(true)
        setError(null)
        try {
            const { url } = await createBillingCheckout(quantity)
            window.location.assign(url)
        } catch (err) {
            setError(err instanceof Error ? err.message : "Checkout failed")
            setLoading(false)
        }
    }

    if (!checkoutUsesApi && !checkoutUrl) {
        return (
            <p className="pf-muted pf-plan-unavailable">
                Checkout is not configured yet. Add billing secrets in the worker environment.
            </p>
        )
    }

    return (
        <div className={className ?? "pf-subscribe-checkout-wrap"}>
            {checkoutUsesApi ? (
                <div
                    className={
                        profileLayout
                            ? "pf-subscribe-checkout pf-subscribe-checkout--profile"
                            : "pf-subscribe-checkout"
                    }
                >
                    {profileLayout ? (
                        <div className="pf-subscribe-checkout-bottom">
                            <div className="pf-subscribe-checkout-controls">
                                <div className="pf-seat-estimate">
                                    <span className="pf-seat-estimate-label">Projects at checkout</span>
                                    <div className="pf-seat-estimate-counter pf-seat-estimate-counter--prominent">
                                        <button
                                            type="button"
                                            className="pf-seat-estimate-btn"
                                            onClick={() => setSeats(quantity - 1)}
                                            disabled={quantity <= clampedMin || loading}
                                            aria-label="Decrease projects"
                                        >
                                            <Minus size={18} aria-hidden />
                                        </button>
                                        <input
                                            type="number"
                                            className="pf-seat-estimate-input"
                                            min={clampedMin}
                                            max={MAX_CHECKOUT_PROJECT_QUANTITY}
                                            value={quantity}
                                            onChange={e =>
                                                setSeats(
                                                    Number.parseInt(e.target.value, 10) || clampedMin
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
                                                quantity >= MAX_CHECKOUT_PROJECT_QUANTITY || loading
                                            }
                                            aria-label="Increase projects"
                                        >
                                            <Plus size={18} aria-hidden />
                                        </button>
                                    </div>
                                </div>
                                <p className="pf-seat-estimate-formula pf-muted">
                                    {formatUsd(PRICE_PER_PROJECT_MONTHLY_USD)} × {quantity} project
                                    {quantity === 1 ? "" : "s"} = {formatUsd(estimatedMonthly)}/mo
                                    (excl. taxes)
                                </p>
                            </div>
                            <div className="pf-subscribe-checkout-footer">
                                <Button
                                    variant="primary"
                                    className={buttonClassName}
                                    onClick={() => void handleApiCheckout()}
                                    disabled={loading}
                                >
                                    {loading ? "Starting checkout…" : label}
                                </Button>
                                {error ? (
                                    <p className="pf-usage-meter-hint pf-usage-meter-hint--warn">
                                        {error}
                                    </p>
                                ) : null}
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="pf-subscribe-checkout-controls">
                                <div className="pf-seat-estimate">
                                    <span className="pf-seat-estimate-label">Projects at checkout</span>
                                    <div className="pf-seat-estimate-counter">
                                        <button
                                            type="button"
                                            className="pf-seat-estimate-btn"
                                            onClick={() => setSeats(quantity - 1)}
                                            disabled={quantity <= clampedMin || loading}
                                            aria-label="Decrease projects"
                                        >
                                            <Minus size={16} aria-hidden />
                                        </button>
                                        <input
                                            type="number"
                                            className="pf-seat-estimate-input"
                                            min={clampedMin}
                                            max={MAX_CHECKOUT_PROJECT_QUANTITY}
                                            value={quantity}
                                            onChange={e =>
                                                setSeats(
                                                    Number.parseInt(e.target.value, 10) || clampedMin
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
                                                quantity >= MAX_CHECKOUT_PROJECT_QUANTITY || loading
                                            }
                                            aria-label="Increase projects"
                                        >
                                            <Plus size={16} aria-hidden />
                                        </button>
                                    </div>
                                </div>
                                <p className="pf-seat-estimate-formula pf-muted">
                                    {formatUsd(PRICE_PER_PROJECT_MONTHLY_USD)} × {quantity} project
                                    {quantity === 1 ? "" : "s"} = {formatUsd(estimatedMonthly)}/mo
                                    (excl. taxes)
                                </p>
                            </div>
                            <div className="pf-subscribe-checkout-footer">
                                <Button
                                    variant="primary"
                                    className={buttonClassName}
                                    onClick={() => void handleApiCheckout()}
                                    disabled={loading}
                                >
                                    {loading ? "Starting checkout…" : label}
                                </Button>
                                {error ? (
                                    <p className="pf-usage-meter-hint pf-usage-meter-hint--warn">
                                        {error}
                                    </p>
                                ) : null}
                            </div>
                        </>
                    )}
                </div>
            ) : (
                <ButtonLink href={checkoutUrl!} variant="primary" className={buttonClassName}>
                    {label}
                </ButtonLink>
            )}
        </div>
    )
}
