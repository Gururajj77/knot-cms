import { Link } from "react-router-dom"
import type { AuthMeUsage } from "../../lib/api"
import { isPaidPlan } from "@knotcms/shared"
import {
    planUsageAlert,
    projectLimitReachedMessage,
    projectsOverLimitMessage,
} from "../../lib/plan-usage"
import { ROUTES } from "../../constants/routes"
import { Banner } from "../../components/ui"

interface PlanUsageBannerProps {
    usage: AuthMeUsage | null | undefined
}

function alertMessage(
    alert: NonNullable<ReturnType<typeof planUsageAlert>>,
    usage: AuthMeUsage
): string {
    switch (alert) {
        case "projects-over-limit":
            return projectsOverLimitMessage(usage)
        case "projects-full":
            return isPaidPlan(usage.planId)
                ? "You're using all paid seats. Add more on your profile or delete a project."
                : projectLimitReachedMessage(usage.planId)
        case "projects":
            return isPaidPlan(usage.planId)
                ? "You're almost at your seat limit."
                : "You're at your project limit soon."
        case "syncs-exhausted":
            return "You've used all free manual syncs. Subscribe on your profile for unlimited syncs per project."
        case "syncs":
            return "You have one manual sync left on your plan."
    }
}

export function PlanUsageBanner({ usage }: PlanUsageBannerProps) {
    const alert = planUsageAlert(usage)
    if (!alert || !usage) return null

    const tone =
        alert === "projects-over-limit" || alert === "projects-full" || alert === "syncs-exhausted"
            ? "error"
            : "info"

    return (
        <Banner tone={tone}>
            {alertMessage(alert, usage)}{" "}
            {alert === "projects-over-limit" ? (
                <span className="pf-muted">Delete extra projects from the list below.</span>
            ) : (
                <Link to={ROUTES.plans} className="pf-banner-link">
                    Open profile
                </Link>
            )}
        </Banner>
    )
}
