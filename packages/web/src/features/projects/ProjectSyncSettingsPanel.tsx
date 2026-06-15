import type { ProjectStatus, PublishMode } from "@knotcms/shared"
import { Link } from "react-router-dom"
import { ROUTES } from "../../constants/routes"
import { formatPublishCooldownMessage } from "../../lib/publish-cooldown"
import { projectSourcePlugin } from "../../lib/source-provider"
import type { SyncFeedbackTone } from "../../lib/sync"
import { Banner, Field, Select, ToggleRow } from "../../components/ui"
import { WebhookSetupCard } from "./WebhookSetupCard"

interface ProjectSyncSettingsPanelProps {
    status: ProjectStatus
    projectId: string
    savingAutomation: boolean
    savingPublish: boolean
    canUseProjectFeatures: boolean
    hasAutoSync: boolean
    hasAutoPublish: boolean
    isOverProjectLimit: boolean
    publishCooldownSec: number
    syncFeedback: { tone: SyncFeedbackTone; message: string } | null
    onAutoSyncChange: (autoSync: boolean) => void
    onPublishChange: (autoPublish: boolean, publishMode: PublishMode) => void
    onWebhookUpdated: (status: ProjectStatus) => void
    onRefresh: () => Promise<void>
}

export function ProjectSyncSettingsPanel({
    status,
    projectId,
    savingAutomation,
    savingPublish,
    canUseProjectFeatures,
    hasAutoSync,
    hasAutoPublish,
    isOverProjectLimit,
    publishCooldownSec,
    syncFeedback,
    onAutoSyncChange,
    onPublishChange,
    onWebhookUpdated,
    onRefresh,
}: ProjectSyncSettingsPanelProps) {
    const showPublishCooldown = Boolean(status.autoPublish) && publishCooldownSec > 0
    const sourcePlugin = projectSourcePlugin(status)

    return (
        <section className="pf-data-panel">
            <div className="pf-project-settings-stack">
                <div className="pf-project-settings-group">
                    <h3 className="pf-project-settings-subtitle">
                        When {sourcePlugin.changesLabel} changes
                    </h3>
                    <ToggleRow
                        label="Auto-sync to Framer"
                        description={`Queue a sync when your ${sourcePlugin.sourceItemLabel.toLowerCase()} is edited.`}
                        checked={status.autoSync}
                        disabled={savingAutomation || !hasAutoSync || !canUseProjectFeatures}
                        onChange={checked => onAutoSyncChange(checked)}
                    />
                    {isOverProjectLimit ? (
                        <p className="pf-plan-gate-hint">
                            Syncing is paused until you delete extra projects.
                        </p>
                    ) : !hasAutoSync ? (
                        <p className="pf-plan-gate-hint">
                            Auto-sync is not on your plan.{" "}
                            <Link to={ROUTES.plans} className="pf-banner-link">
                                View plans
                            </Link>
                        </p>
                    ) : null}

                    {status.autoSync ? (
                        <WebhookSetupCard
                            embedded
                            status={status}
                            projectId={projectId}
                            onUpdated={onWebhookUpdated}
                            onRefresh={onRefresh}
                        />
                    ) : null}
                </div>

                <div className="pf-project-settings-divider" aria-hidden />

                <div className="pf-project-settings-group">
                    <h3 className="pf-project-settings-subtitle">After each sync</h3>
                    {syncFeedback ? (
                        <Banner tone={syncFeedback.tone} className="pf-banner--inset">
                            {syncFeedback.message}
                        </Banner>
                    ) : null}
                    {showPublishCooldown ? (
                        <Banner tone="info" className="pf-banner--inset">
                            {formatPublishCooldownMessage(publishCooldownSec)}
                        </Banner>
                    ) : null}
                    <ToggleRow
                        label="Auto-publish Framer site"
                        description="Deploy or preview your site when a sync finishes."
                        checked={status.autoPublish}
                        disabled={savingPublish || !hasAutoPublish || !canUseProjectFeatures}
                        onChange={checked =>
                            onPublishChange(checked, status.publishMode as PublishMode)
                        }
                    />
                    {!hasAutoPublish && !isOverProjectLimit ? (
                        <p className="pf-plan-gate-hint">
                            Auto-publish is not on your plan.{" "}
                            <Link to={ROUTES.plans} className="pf-banner-link">
                                View plans
                            </Link>
                        </p>
                    ) : null}
                    {status.autoPublish ? (
                        <Field label="Publish mode" htmlFor="publish-mode" className="pf-field--spaced">
                            <Select
                                id="publish-mode"
                                value={status.publishMode}
                                disabled={savingPublish}
                                onChange={e =>
                                    onPublishChange(
                                        status.autoPublish,
                                        e.target.value as PublishMode
                                    )
                                }
                            >
                                <option value="deploy_live">Deploy to live site</option>
                                <option value="preview_only">Preview only</option>
                            </Select>
                        </Field>
                    ) : null}
                </div>
            </div>
        </section>
    )
}
