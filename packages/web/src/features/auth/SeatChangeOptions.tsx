import { useState } from "react"
import { Check } from "lucide-react"
import { restartBillingWithSeats } from "../../lib/api/billing"
import { Button } from "../../components/ui"
import { BillingActionConfirmModal } from "./BillingActionConfirmModal"
import { PRICE_PER_PROJECT_MONTHLY_USD } from "@knotcms/shared"
import { computePlanReminderAtLabel } from "./plan-reminder"

interface SeatChangeOptionsProps {
    currentSeats: number
    desiredSeats: number
    subscriptionRenewsAt: string | null
    planReminderDue?: boolean
    pendingPlanQuantity?: number | null
    onSuccess?: () => void | Promise<void>
}

function formatUsd(amount: number): string {
    return amount.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2,
    })
}

export function SeatChangeOptions({
    currentSeats,
    desiredSeats,
    subscriptionRenewsAt,
    planReminderDue = false,
    pendingPlanQuantity = null,
    onSuccess,
}: SeatChangeOptionsProps) {
    const [loading, setLoading] = useState(false)
    const [feedback, setFeedback] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [modalOpen, setModalOpen] = useState(false)
    const [modalError, setModalError] = useState<string | null>(null)

    const isDowngrade = desiredSeats < currentSeats
    const reminderLabel = computePlanReminderAtLabel(subscriptionRenewsAt)
    const monthlyUsd = desiredSeats * PRICE_PER_PROJECT_MONTHLY_USD

    const closeModal = () => {
        if (loading) return
        setModalOpen(false)
        setModalError(null)
    }

    const handleRestart = async (timing: "now" | "before_renewal") => {
        setLoading(true)
        setModalError(null)
        setFeedback(null)
        setError(null)
        try {
            const result = await restartBillingWithSeats(desiredSeats, timing)
            if (result.deferred) {
                setFeedback(result.message)
                closeModal()
                await onSuccess?.()
                return
            }
            if (result.url) {
                window.open(result.url, "_blank", "noopener,noreferrer")
            }
            closeModal()
            await onSuccess?.()
        } catch (err) {
            setModalError(err instanceof Error ? err.message : "Could not update your plan")
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <div className="pf-seat-change-options">
                <div className="pf-seat-change-options-header">
                    <h3 className="pf-seat-change-options-title">Update your seats</h3>
                    <p className="pf-seat-change-options-lead">
                        You selected {desiredSeats} seat{desiredSeats === 1 ? "" : "s"} (today you
                        have {currentSeats}).
                        {planReminderDue && pendingPlanQuantity ? (
                            <>
                                {" "}
                                Your saved plan change for {pendingPlanQuantity} seat
                                {pendingPlanQuantity === 1 ? "" : "s"} is ready — act below or wait
                                until renewal.
                            </>
                        ) : null}
                    </p>
                </div>

                <article className="pf-plan-card pf-seat-change-option-card pf-plan-card--featured pf-seat-change-options-single">
                    <div className="pf-seat-change-section">
                        <span className="pf-plan-badge pf-seat-change-option-badge">
                            {isDowngrade ? "Fewer seats" : "Seat change"}
                        </span>
                        <h4 className="pf-plan-name">Cancel and start a new subscription</h4>
                        <p className="pf-plan-tagline">
                            End your current plan and checkout again at {desiredSeats} seat
                            {desiredSeats === 1 ? "" : "s"} ({formatUsd(monthlyUsd)}/mo, excl. taxes).
                            No refund for unused time this period.
                        </p>
                        <ul className="pf-plan-features">
                            <li>
                                <Check size={14} strokeWidth={2} aria-hidden />
                                Works for more or fewer seats
                            </li>
                            <li>
                                <Check size={14} strokeWidth={2} aria-hidden />
                                Cancel now, or exit and return 2 days before renewal
                            </li>
                        </ul>

                        <Button
                            variant="primary"
                            className="pf-plan-cta"
                            onClick={() => {
                                setError(null)
                                setModalError(null)
                                setModalOpen(true)
                            }}
                            disabled={loading}
                        >
                            Update to {desiredSeats} seat{desiredSeats === 1 ? "" : "s"}
                        </Button>
                        {feedback ? (
                            <p className="pf-seat-change-option-feedback">{feedback}</p>
                        ) : null}
                        {error ? (
                            <p className="pf-seat-change-option-feedback pf-usage-meter-hint--warn">
                                {error}
                            </p>
                        ) : null}
                    </div>
                </article>

                {isDowngrade ? (
                    <p className="pf-muted pf-pricing-footnote pf-seat-change-options-footnote">
                        Lowering seats on the same plan is not supported — cancel and start fresh is
                        required.
                    </p>
                ) : null}
            </div>

            <BillingActionConfirmModal
                open={modalOpen}
                title="Cancel and start a new subscription?"
                description="Type KNOTKNOT to cancel now, or exit to save your plan change for before renewal."
                confirmLabel="Cancel now"
                confirmVariant="danger"
                busy={loading}
                onCancel={closeModal}
                onConfirm={() => void handleRestart("now")}
                secondaryConfirmLabel={
                    reminderLabel
                        ? `Exit and come back on ${reminderLabel}`
                        : "Exit and come back before renewal"
                }
                secondaryConfirmDisabled={!reminderLabel}
                onSecondaryConfirm={() => void handleRestart("before_renewal")}
                details={
                    <>
                        <p>
                            Your subscription will be cancelled when you act. You will{" "}
                            <strong>not</strong> receive a refund for unused time.
                        </p>
                        <p>
                            New plan:{" "}
                            <strong>
                                {desiredSeats} seat{desiredSeats === 1 ? "" : "s"}
                            </strong>{" "}
                            at <strong>{formatUsd(monthlyUsd)}/mo</strong> (excl. taxes).
                        </p>
                        {reminderLabel ? (
                            <p className="pf-muted">
                                If you exit now, return on <strong>{reminderLabel}</strong> (2 days
                                before renewal) to cancel and checkout. Your current plan stays
                                active until then.
                            </p>
                        ) : (
                            <p className="pf-muted pf-usage-meter-hint--warn">
                                Renewal date unavailable — only cancel now is available.
                            </p>
                        )}
                        {modalError ? (
                            <p className="pf-usage-meter-hint pf-usage-meter-hint--warn">{modalError}</p>
                        ) : null}
                    </>
                }
            />
        </>
    )
}
