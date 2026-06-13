import type { ProjectStatus } from "@knotcms/shared"
import { Clock, Database, Webhook } from "lucide-react"
import { formatRelativeTime } from "../../lib/format"
import { webhookStatusLabel } from "../../lib/webhook"

interface ProjectActivityMetricsProps {
    status: ProjectStatus
}

export function ProjectActivityMetrics({ status }: ProjectActivityMetricsProps) {
    const webhookWarn = status.autoSync && status.webhookStatus !== "active"

    return (
        <div className="pf-project-metrics" aria-label="Sync activity">
            <div className="pf-project-metric">
                <span className="pf-project-metric-label">
                    <Clock size={12} aria-hidden />
                    Last sync
                </span>
                <span className="pf-project-metric-value">{formatRelativeTime(status.lastSyncAt)}</span>
            </div>
            <div className="pf-project-metric">
                <span className="pf-project-metric-label">
                    <Database size={12} aria-hidden />
                    Items in Framer
                </span>
                <span className="pf-project-metric-value">{status.itemsSyncedCount}</span>
            </div>
            <div className="pf-project-metric">
                <span className="pf-project-metric-label">
                    <Webhook size={12} aria-hidden />
                    Webhook
                </span>
                <span className={`pf-project-metric-value${webhookWarn ? " pf-project-metric-value--warn" : ""}`}>
                    {webhookStatusLabel(
                        status.webhookStatus,
                        status.autoSync,
                        Boolean(status.webhookVerificationToken)
                    )}
                </span>
            </div>
        </div>
    )
}
