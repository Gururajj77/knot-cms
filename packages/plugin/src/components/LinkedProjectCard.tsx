import type { PluginProjectSummary } from "@knotcms/shared"
import { formatRelativeTime } from "../lib/formatRelativeTime"
import { sourceProviderLabel } from "../lib/sourceLabels"
import { SourceIcon } from "./SourceIcon"

interface LinkedProjectCardProps {
    project: PluginProjectSummary
}

export function LinkedProjectCard({ project }: LinkedProjectCardProps) {
    const collectionLabel =
        project.framerCollectionName?.trim() ||
        project.sourceTitle?.trim() ||
        "Synced collection"
    const sourceLabel = project.sourceTitle?.trim() || sourceProviderLabel(project.sourceProvider)
    const hasError = Boolean(project.lastError?.trim())

    return (
        <article className="pf-linked-project">
            <div className="pf-linked-project-head">
                <SourceIcon provider={project.sourceProvider} size={16} />
                <div className="pf-linked-project-titles">
                    <h3 className="pf-linked-project-name">{collectionLabel}</h3>
                    <p className="pf-linked-project-source">
                        {sourceProviderLabel(project.sourceProvider)} · {sourceLabel}
                    </p>
                </div>
            </div>

            <dl className="pf-linked-project-meta">
                <div className="pf-linked-project-meta-row">
                    <dt>Last sync</dt>
                    <dd>{formatRelativeTime(project.lastSyncAt)}</dd>
                </div>
                <div className="pf-linked-project-meta-row">
                    <dt>Auto-sync</dt>
                    <dd>{project.autoSync ? "On" : "Off"}</dd>
                </div>
                {project.itemsSyncedCount > 0 ? (
                    <div className="pf-linked-project-meta-row">
                        <dt>Items</dt>
                        <dd>{project.itemsSyncedCount}</dd>
                    </div>
                ) : null}
            </dl>

            {hasError ? (
                <p className="pf-linked-project-error" role="status">
                    {project.lastError}
                </p>
            ) : null}
        </article>
    )
}
