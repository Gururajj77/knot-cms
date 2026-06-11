import { Link } from "react-router-dom"
import type { AuthMeUsage } from "../../lib/api"
import { planUsageAlert, projectLimitReachedMessage } from "../../lib/plan-usage"
import { ROUTES } from "../../constants/routes"
import { Banner } from "../../components/ui"

interface PlanUsageBannerProps {
    usage: AuthMeUsage | null | undefined
}

function alertMessage(
    alert: NonNullable<ReturnType<typeof planUsageAlert>>,
    planId: string | undefined
): string {
    switch (alert) {
        case "projects-full":
            return projectLimitReachedMessage(planId)
        case "projects":
            return "You're at your project limit soon."
        case "syncs-exhausted":
            return "You've used all manual syncs on your plan."
        case "syncs":
            return "You have one manual sync left on your plan."
    }
}

export function PlanUsageBanner({ usage }: PlanUsageBannerProps) {
    const alert = planUsageAlert(usage)
    if (!alert) return null

    const tone = alert === "projects-full" || alert === "syncs-exhausted" ? "error" : "info"

    return (
        <Banner tone={tone}>
            {alertMessage(alert, usage?.planId)}{" "}
            <Link to={ROUTES.plans} className="pf-banner-link">
                Open profile
            </Link>
        </Banner>
    )
}
