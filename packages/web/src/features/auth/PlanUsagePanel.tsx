import { useEffect, useState } from "react"
import { Check, Minus, Plus, X } from "lucide-react"
import type { AuthMe } from "../../lib/api"
import { PRICE_PER_PROJECT_MONTHLY_USD } from "@knotcms/shared"
import {
    hasManualSyncQuota,
    isFreePlan,
    projectLimitReachedMessage,
    projectUsagePercent,
    syncUsagePercent,
} from "../../lib/plan-usage"
import { formatSubscriptionEndDate } from "../../lib/format"
import { Badge, Button, ButtonLink, Card } from "../../components/ui"

const MAX_SEAT_ESTIMATE = 500

function formatUsd(amount: number): string {
    return amount.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
}

interface SeatEstimateControlsProps {
    currentSeats: number
    projectsInUse: number
    portalUrl: string
}

function SeatEstimateControls({ currentSeats, projectsInUse, portalUrl }: SeatEstimateControlsProps) {
    const minSeats = Math.max(1, projectsInUse)
    const [desiredSeats, setDesiredSeats] = useState(currentSeats)
    const [hasEstimated, setHasEstimated] = useState(false)

    useEffect(() => {
        setDesiredSeats(currentSeats)
        setHasEstimated(false)
    }, [currentSeats])

    const estimatedMonthly = desiredSeats * PRICE_PER_PROJECT_MONTHLY_USD
    const currentMonthly = currentSeats * PRICE_PER_PROJECT_MONTHLY_USD
    const belowInUse = desiredSeats < projectsInUse

    const setSeats = (next: number) => {
        const clamped = Math.min(MAX_SEAT_ESTIMATE, Math.max(minSeats, next))
        setDesiredSeats(clamped)
        setHasEstimated(true)
    }

    return (
        <div className="pf-usage-billing-cta">
            <div className="pf-usage-billing-split">
                <div className="pf-usage-billing-copy-col">
                    <p className="pf-usage-billing-copy">
                        <strong>${PRICE_PER_PROJECT_MONTHLY_USD} per project per month.</strong> Adjust seats
                        on the right to estimate your bill, then open Polar to apply the change.
                        Proration and your final charge are shown there before you confirm.
                    </p>
                    <ul className="pf-usage-billing-notes">
                        <li>
                            Each seat is one Framer site you can connect — unlimited syncs and
                            automation per paid project.
                        </li>
                        <li>
                            Payment, invoices, and cancellation are managed in Polar&apos;s billing
                            portal.
                        </li>
                        <li>After any change in Polar, click Refresh status on this profile page.</li>
                        <li>
                            Lowering seats does not delete projects here — remove extras first if
                            you are over the new limit.
                        </li>
                    </ul>
                </div>

                <div className="pf-usage-billing-action-col">
                    <div className="pf-seat-estimate">
                        <span className="pf-seat-estimate-label">Seats (projects)</span>
                        <div className="pf-seat-estimate-counter">
                            <button
                                type="button"
                                className="pf-seat-estimate-btn"
                                onClick={() => setSeats(desiredSeats - 1)}
                                disabled={desiredSeats <= minSeats}
                                aria-label="Decrease seats"
                            >
                                <Minus size={16} aria-hidden />
                            </button>
                            <input
                                type="number"
                                className="pf-seat-estimate-input"
                                min={minSeats}
                                max={MAX_SEAT_ESTIMATE}
                                value={desiredSeats}
                                onChange={e =>
                                    setSeats(Number.parseInt(e.target.value, 10) || minSeats)
                                }
                                aria-label="Desired seat count"
                            />
                            <button
                                type="button"
                                className="pf-seat-estimate-btn"
                                onClick={() => setSeats(desiredSeats + 1)}
                                disabled={desiredSeats >= MAX_SEAT_ESTIMATE}
                                aria-label="Increase seats"
                            >
                                <Plus size={16} aria-hidden />
                            </button>
                        </div>
                    </div>

                    {hasEstimated ? (
                        <div className="pf-seat-estimate-result" aria-live="polite">
                            <p className="pf-seat-estimate-eyebrow">Estimated monthly (excl. taxes)</p>
                            <p className="pf-seat-estimate-total-heading">{formatUsd(estimatedMonthly)}</p>
                            <p className="pf-seat-estimate-formula">
                                {formatUsd(PRICE_PER_PROJECT_MONTHLY_USD)} × {desiredSeats} seat
                                {desiredSeats === 1 ? "" : "s"} · excluding taxes
                            </p>
                            {desiredSeats !== currentSeats ? (
                                <p className="pf-seat-estimate-delta">
                                    {desiredSeats > currentSeats ? "Increase" : "Decrease"} from{" "}
                                    {formatUsd(currentMonthly)}/mo excl. taxes ({currentSeats} seat
                                    {currentSeats === 1 ? "" : "s"} today).
                                </p>
                            ) : (
                                <p className="pf-seat-estimate-delta">
                                    Matches your current subscription.
                                </p>
                            )}
                            {belowInUse ? (
                                <p className="pf-usage-meter-hint pf-usage-meter-hint--warn">
                                    You have {projectsInUse} project
                                    {projectsInUse === 1 ? "" : "s"} in use. Delete extras before
                                    lowering seats below that.
                                </p>
                            ) : null}

                            {!belowInUse ? (
                                <ButtonLink
                                    href={portalUrl}
                                    variant="primary"
                                    className="pf-usage-billing-btn"
                                >
                                    Manage seats in billing portal
                                </ButtonLink>
                            ) : (
                                <Button variant="primary" className="pf-usage-billing-btn" disabled>
                                    Manage seats in billing portal
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="pf-seat-estimate-pending">
                            <p className="pf-seat-estimate-hint pf-muted">
                                Use + or − to calculate your monthly total (excluding taxes).
                            </p>
                            <Button variant="primary" className="pf-usage-billing-btn" disabled>
                                Manage seats in billing portal
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

interface PlanUsagePanelProps {
    auth: AuthMe
    onRefresh: () => void
}

function subscriptionLine(auth: AuthMe): string {
    const usage = auth.usage
    if (!usage) return "Loading usage…"

    if (isFreePlan(auth.planId)) {
        return "Free tier — no subscription required"
    }

    if (auth.subscriptionCancelAtPeriodEnd && auth.subscriptionEndsAt) {
        return `Canceled — access until ${formatSubscriptionEndDate(auth.subscriptionEndsAt)}`
    }

    if (auth.subscriptionStatus === "active" || auth.subscriptionStatus === "trialing") {
        return "Subscription active"
    }
    if (auth.subscriptionStatus === "past_due") {
        return "Subscription past due"
    }
    return "Subscription inactive"
}

function FeatureRow({ label, enabled }: { label: string; enabled: boolean }) {
    return (
        <li className={enabled ? "pf-usage-feature pf-usage-feature--on" : "pf-usage-feature pf-usage-feature--off"}>
            {enabled ? <Check size={14} aria-hidden /> : <X size={14} aria-hidden />}
            {label}
        </li>
    )
}

export function PlanUsagePanel({ auth, onRefresh }: PlanUsagePanelProps) {
    const usage = auth.usage

    if (!usage) {
        return (
            <Card className="pf-usage-panel">
                <p className="pf-muted">Usage data is not available yet. Try refreshing your account.</p>
                <Button variant="ghost" onClick={() => void onRefresh()}>
                    Refresh status
                </Button>
            </Card>
        )
    }

    const projectPct = projectUsagePercent(usage)
    const syncPct = syncUsagePercent(usage)
    const atProjectLimit = usage.projectCount >= usage.projectLimit
    const showManualSyncMeter = hasManualSyncQuota(usage)
    const syncsExhausted = showManualSyncMeter && usage.syncRemaining !== null && usage.syncRemaining <= 0
    const customerPortalUrl = auth.customerPortalUrl?.trim() || null
    const showPaidBillingCta = !isFreePlan(auth.planId) && Boolean(customerPortalUrl)

    return (
        <div className="pf-usage-layout">
            <Card className="pf-usage-panel pf-usage-panel--hero">
                <div className="pf-usage-panel-head">
                    <div>
                        <p className="pf-eyebrow">Current plan</p>
                        <h2 className="pf-usage-plan-name">{usage.planName}</h2>
                        <p className="pf-usage-plan-sub">{subscriptionLine(auth)}</p>
                    </div>
                    <Badge tone={auth.entitled ? "ok" : "warn"}>{usage.planName}</Badge>
                </div>

                <div
                    className={`pf-usage-meters${showManualSyncMeter ? "" : " pf-usage-meters--single"}`}
                >
                    <div className="pf-usage-meter">
                        <div className="pf-usage-meter-head">
                            <span className="pf-usage-meter-label">Projects</span>
                            <span className="pf-usage-meter-value">
                                {usage.projectCount} / {usage.projectLimit}
                            </span>
                        </div>
                        <div
                            className="pf-usage-meter-track"
                            role="progressbar"
                            aria-valuenow={usage.projectCount}
                            aria-valuemin={0}
                            aria-valuemax={usage.projectLimit}
                            aria-label="Projects used"
                        >
                            <div
                                className={`pf-usage-meter-fill${atProjectLimit ? " pf-usage-meter-fill--warn" : ""}`}
                                style={{ width: `${projectPct}%` }}
                            />
                        </div>
                        {atProjectLimit ? (
                            <p className="pf-usage-meter-hint pf-usage-meter-hint--warn">
                                {projectLimitReachedMessage(auth.planId)}
                            </p>
                        ) : null}
                    </div>

                    {showManualSyncMeter ? (
                        <div className="pf-usage-meter">
                            <div className="pf-usage-meter-head">
                                <span className="pf-usage-meter-label">Manual syncs</span>
                                <span className="pf-usage-meter-value">
                                    {usage.syncRemaining} remaining
                                </span>
                            </div>
                            {syncPct !== null ? (
                                <div
                                    className="pf-usage-meter-track"
                                    role="progressbar"
                                    aria-valuenow={usage.syncCount}
                                    aria-valuemin={0}
                                    aria-valuemax={usage.syncCount + (usage.syncRemaining ?? 0)}
                                    aria-label="Manual syncs used"
                                >
                                    <div
                                        className={`pf-usage-meter-fill${syncsExhausted ? " pf-usage-meter-fill--warn" : ""}`}
                                        style={{ width: `${syncPct}%` }}
                                    />
                                </div>
                            ) : null}
                            <p className="pf-usage-meter-hint">
                                {usage.syncCount} used — &quot;Sync now&quot; on a project (lifetime quota on
                                Basic)
                            </p>
                            {syncsExhausted ? (
                                <p className="pf-usage-meter-hint pf-usage-meter-hint--warn">
                                    Manual sync quota used up. Subscribe below for unlimited syncs per
                                    project.
                                </p>
                            ) : null}
                        </div>
                    ) : null}
                </div>

                {showPaidBillingCta ? (
                    <SeatEstimateControls
                        currentSeats={usage.projectLimit}
                        projectsInUse={usage.projectCount}
                        portalUrl={customerPortalUrl!}
                    />
                ) : null}
            </Card>

            <Card className="pf-usage-panel">
                <h3 className="pf-usage-section-title">Included features</h3>
                <ul className="pf-usage-features">
                    <FeatureRow
                        label="Unlimited manual syncs (Sync now button)"
                        enabled={!showManualSyncMeter}
                    />
                    <FeatureRow label="Auto-sync on Notion changes" enabled={usage.features.autoSync} />
                    <FeatureRow label="Auto-publish after sync" enabled={usage.features.autoPublish} />
                </ul>
            </Card>
        </div>
    )
}
