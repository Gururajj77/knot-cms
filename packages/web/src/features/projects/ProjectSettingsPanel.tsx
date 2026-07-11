import type { ProjectStatus, PublishMode } from "@knotcms/shared"
import { Trash2 } from "lucide-react"
import { Button, Banner, Field, Input } from "../../components/ui"
import type { SyncFeedbackTone } from "../../lib/sync"
import { ProjectSyncSettingsPanel } from "./ProjectSyncSettingsPanel"

interface ProjectSettingsPanelProps {
    status: ProjectStatus
    projectId: string
    isNotionProject: boolean
    savingAutomation: boolean
    savingPublish: boolean
    canUseProjectFeatures: boolean
    hasAutoSync: boolean
    hasAutoPublish: boolean
    isOverProjectLimit: boolean
    publishCooldownSec: number
    syncFeedback: { tone: SyncFeedbackTone; message: string } | null
    importing: boolean
    syncing: boolean
    deleting: boolean
    importCollectionId: string
    importFeedback: string | null
    onAutoSyncChange: (autoSync: boolean) => void
    onPublishChange: (autoPublish: boolean, publishMode: PublishMode) => void
    onWebhookUpdated: (status: ProjectStatus) => void
    onRefresh: () => Promise<void>
    onImportCollectionIdChange: (value: string) => void
    onImportFramer: () => void
    onDelete: () => void
}

export function ProjectSettingsPanel({
    status,
    projectId,
    isNotionProject,
    savingAutomation,
    savingPublish,
    canUseProjectFeatures,
    hasAutoSync,
    hasAutoPublish,
    isOverProjectLimit,
    publishCooldownSec,
    syncFeedback,
    importing,
    syncing,
    deleting,
    importCollectionId,
    importFeedback,
    onAutoSyncChange,
    onPublishChange,
    onWebhookUpdated,
    onRefresh,
    onImportCollectionIdChange,
    onImportFramer,
    onDelete,
}: ProjectSettingsPanelProps) {
    return (
        <div
            id="project-panel-settings"
            role="tabpanel"
            aria-labelledby="project-tab-settings"
            className="pf-project-tab-panel"
        >
            <section className="pf-project-section" aria-labelledby="project-sync-heading">
                <div className="pf-project-section-intro">
                    <h2 id="project-sync-heading" className="pf-project-section-label">
                        Automation
                    </h2>
                    <p className="pf-project-section-desc">
                        Control when KnotCMS syncs and whether Framer publishes after each run.
                    </p>
                </div>
                <ProjectSyncSettingsPanel
                    status={status}
                    projectId={projectId}
                    savingAutomation={savingAutomation}
                    savingPublish={savingPublish}
                    canUseProjectFeatures={canUseProjectFeatures}
                    hasAutoSync={hasAutoSync}
                    hasAutoPublish={hasAutoPublish}
                    isOverProjectLimit={isOverProjectLimit}
                    publishCooldownSec={publishCooldownSec}
                    syncFeedback={syncFeedback}
                    onAutoSyncChange={onAutoSyncChange}
                    onPublishChange={onPublishChange}
                    onWebhookUpdated={onWebhookUpdated}
                    onRefresh={onRefresh}
                />
            </section>

            {isNotionProject ? (
                <section className="pf-project-section" aria-labelledby="project-tools-heading">
                    <div className="pf-project-section-intro">
                        <h2 id="project-tools-heading" className="pf-project-section-label">
                            Advanced tools
                        </h2>
                        <p className="pf-project-section-desc">
                            One-time utilities for this connection. Most projects only need sync and
                            automation above.
                        </p>
                    </div>
                    <div className="pf-data-panel pf-project-tools-panel">
                        <header className="pf-project-tools-head">
                            <div className="pf-project-tools-copy">
                                <p className="pf-project-panel-title">Import from Framer into Notion</p>
                                <p className="pf-project-panel-desc">
                                    Pull rows from a Framer CMS collection into your linked Notion
                                    database. Existing Notion rows with the same slug are skipped.
                                </p>
                            </div>
                        </header>
                        {importFeedback ? (
                            <Banner tone="info" className="pf-banner--inset">
                                {importFeedback}
                            </Banner>
                        ) : null}
                        <div className="pf-project-tools-form">
                            <Field label="Framer collection ID (optional)" htmlFor="import-framer-collection-id">
                                <Input
                                    id="import-framer-collection-id"
                                    value={importCollectionId}
                                    disabled={importing || !canUseProjectFeatures}
                                    placeholder="Only needed for separate KnotCMS collections"
                                    onChange={e => onImportCollectionIdChange(e.target.value)}
                                />
                            </Field>
                            <Button
                                variant="secondary"
                                className="pf-project-tools-action"
                                onClick={() => void onImportFramer()}
                                disabled={importing || syncing || deleting || !canUseProjectFeatures}
                            >
                                {importing ? "Importing…" : "Import from Framer"}
                            </Button>
                        </div>
                    </div>
                </section>
            ) : null}

            <section
                className="pf-project-section pf-project-section--danger"
                aria-labelledby="project-danger-heading"
            >
                <div className="pf-project-section-intro">
                    <h2 id="project-danger-heading" className="pf-project-section-label">
                        Danger zone
                    </h2>
                    <p className="pf-project-section-desc">
                        Remove this KnotCMS connection without deleting your Framer CMS collection.
                    </p>
                </div>
                <div className="pf-data-panel pf-project-danger-panel">
                    <div className="pf-project-danger-copy">
                        <p className="pf-project-panel-title">Delete this connection</p>
                        <p className="pf-project-panel-desc">
                            Stops syncing in KnotCMS. Your Framer CMS collection is unchanged — remove
                            it in Framer if you no longer need it.
                        </p>
                    </div>
                    <Button variant="danger" onClick={onDelete} disabled={deleting}>
                        <Trash2 size={15} aria-hidden />
                        Delete connection
                    </Button>
                </div>
            </section>
        </div>
    )
}
