import { RefreshCw, Users, Zap } from "lucide-react"
import { isPaidPlan } from "@knotcms/shared"
import type { AuthMeUsage } from "../../lib/api"
import {
    planUsageAlert,
    type PlanUsageAlert,
} from "../../lib/plan-usage"
import { ROUTES } from "../../constants/routes"
import { UsageCallout, type UsageCalloutAction, type UsageCalloutTone } from "../../components/ui/UsageCallout"

interface PlanUsageBannerProps {
    usage: AuthMeUsage | null | undefined
    /** Hide "View projects" when already on a project page. */
    hideProjectLink?: boolean
}

interface UsageCalloutContent {
    tone: UsageCalloutTone
    icon: React.ReactNode
    title: string
    description: string
    meter?: { value: number; max: number; label: string }
    actions: UsageCalloutAction[]
}

function seatLabel(usage: AuthMeUsage): string {
    return isPaidPlan(usage.planId)
        ? `${usage.projectCount} of ${usage.projectLimit} seat${usage.projectLimit === 1 ? "" : "s"}`
        : `${usage.projectCount} of ${usage.projectLimit} project${usage.projectLimit === 1 ? "" : "s"}`
}

function calloutForAlert(
    alert: PlanUsageAlert,
    usage: AuthMeUsage,
    hideProjectLink: boolean
): UsageCalloutContent {
    const managePlan: UsageCalloutAction = {
        label: isPaidPlan(usage.planId) ? "Manage plan" : "View plans",
        href: ROUTES.plans,
        variant: "primary",
    }
    const viewProjects: UsageCalloutAction = {
        label: "View projects",
        href: ROUTES.home,
        variant: "secondary",
    }

    switch (alert) {
        case "projects-over-limit":
            return {
                tone: "error",
                icon: <Users size={18} />,
                title: "Over your seat limit",
                description: isPaidPlan(usage.planId)
                    ? `You have ${usage.projectCount} connections but your plan covers ${usage.projectLimit}. Syncing is paused until you remove the extra ${usage.projectCount - usage.projectLimit} or add seats.`
                    : `You have ${usage.projectCount} projects but ${usage.planName} allows ${usage.projectLimit}. Delete extras to resume syncing.`,
                meter: {
                    value: usage.projectCount,
                    max: usage.projectLimit,
                    label: seatLabel(usage),
                },
                actions: hideProjectLink ? [managePlan] : [viewProjects, managePlan],
            }
        case "projects-full":
            return {
                tone: "warning",
                icon: <Users size={18} />,
                title: isPaidPlan(usage.planId) ? "All seats in use" : "Project limit reached",
                description: isPaidPlan(usage.planId)
                    ? "Every seat on your plan is connected. Add seats on your profile or delete a connection you no longer need."
                    : `You've used all ${usage.projectLimit} project slot${usage.projectLimit === 1 ? "" : "s"} on ${usage.planName}. Upgrade or remove a connection to add another.`,
                meter: {
                    value: usage.projectCount,
                    max: usage.projectLimit,
                    label: seatLabel(usage),
                },
                actions: hideProjectLink ? [managePlan] : [managePlan, viewProjects],
            }
        case "projects":
            return {
                tone: "info",
                icon: <Users size={18} />,
                title: "Almost at your limit",
                description: isPaidPlan(usage.planId)
                    ? "One seat left on your plan. Add seats before connecting another Framer project."
                    : "One project slot left. Upgrade on your profile if you need more connections.",
                meter: {
                    value: usage.projectCount,
                    max: usage.projectLimit,
                    label: seatLabel(usage),
                },
                actions: [managePlan],
            }
        case "syncs-exhausted":
            return {
                tone: "warning",
                icon: <RefreshCw size={18} />,
                title: "Manual syncs used up",
                description:
                    "You've used all free manual syncs for this billing period. Subscribe for unlimited syncs per project.",
                actions: [managePlan],
            }
        case "syncs":
            return {
                tone: "info",
                icon: <Zap size={18} />,
                title: "One manual sync left",
                description: "After that, manual sync pauses until you upgrade or the next billing period.",
                actions: [managePlan],
            }
    }
}

export function PlanUsageBanner({ usage, hideProjectLink = false }: PlanUsageBannerProps) {
    const alert = planUsageAlert(usage)
    if (!alert || !usage) return null

    const content = calloutForAlert(alert, usage, hideProjectLink)

    return (
        <UsageCallout
            tone={content.tone}
            icon={content.icon}
            title={content.title}
            description={content.description}
            meter={content.meter}
            actions={content.actions}
        />
    )
}
