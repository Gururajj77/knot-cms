import { Check, X } from "lucide-react"
import { Link } from "react-router-dom"
import type { AuthMe } from "../../lib/api"
import {
    hasManualSyncQuota,
    isFreePlan,
    projectLimitReachedMessage,
    projectUsagePercent,
    syncUsagePercent,
    upgradeCheckoutPlan,
    upgradePlanLabel,
} from "../../lib/plan-usage"
import { ROUTES } from "../../constants/routes"
import { Badge, Button, Card, buttonClass } from "../../components/ui"
import { checkoutUrlForPlan, resolvePlanCheckoutUrls } from "./plans"

interface PlanUsagePanelProps {
    auth: AuthMe
    onRefresh: () => void
}

function subscriptionLine(auth: AuthMe): string {
    const usage = auth.usage
    if (!usage) return "Loading usage…"

    if (isFreePlan(auth.planId)) {
        return auth.planId === "appsumo"
            ? "Lifetime access — no subscription required"
            : "Free tier — no subscription required"
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
    const checkoutUrls = resolvePlanCheckoutUrls(auth.checkoutUrls)
    const upgradeTarget = upgradeCheckoutPlan(auth.planId)
    const upgradeUrl = upgradeTarget ? checkoutUrlForPlan(checkoutUrls, upgradeTarget) : null

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
                                    Manual sync quota used up. Upgrade to Pro for unlimited manual syncs and
                                    auto-sync.
                                </p>
                            ) : null}
                        </div>
                    ) : null}
                </div>
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

            <div className="pf-usage-actions">
                <Link className={buttonClass("primary")} to={ROUTES.home}>
                    Go to projects
                </Link>
                <Button variant="ghost" onClick={() => void onRefresh()}>
                    Refresh status
                </Button>
                {upgradeTarget && upgradeUrl ? (
                    <a className={buttonClass("secondary")} href={upgradeUrl}>
                        {upgradePlanLabel(upgradeTarget)}
                    </a>
                ) : null}
                {upgradeTarget && !upgradeUrl ? (
                    <Link className={buttonClass("secondary")} to={ROUTES.subscribe}>
                        {upgradePlanLabel(upgradeTarget)}
                    </Link>
                ) : null}
            </div>
        </div>
    )
}
