import { importRowMaxForPlan, normalizePlanId } from "@knotcms/shared"
import { Link, useParams } from "react-router-dom"
import { useAuthContext } from "../../app/AuthContext"
import { ROUTES } from "../../constants/routes"
import { messageBannerTone } from "../../lib/api-errors"
import { AppShell } from "../../components/layout"
import { Banner, Spinner, Stepper, buttonClass } from "../../components/ui"
import { SETUP_STEPS } from "./constants"
import { FramerStep } from "./steps/FramerStep"
import { MappingStep } from "./steps/MappingStep"
import { SourceStep } from "./steps/SourceStep"
import { useSetupWizard } from "./useSetupWizard"

export function ReconfigureSetupPage() {
    const { projectId } = useParams<{ projectId: string }>()
    const { refresh, canSync, hasAutoSync, hasAutoPublish, usage } = useAuthContext()
    const wizard = useSetupWizard({
        reconfigureProjectId: projectId,
        onProjectCreated: refresh,
        hasAutoSync,
        hasAutoPublish,
        importRowMax: importRowMaxForPlan(normalizePlanId(usage?.planId)),
    })

    if (!projectId) {
        return <p className="pf-muted">Missing project id</p>
    }

    const backTo = { label: "Back to project", href: ROUTES.project(projectId) }

    return (
        <AppShell
            title="Reconfigure connection"
            subtitle="Change your content source or update field mapping for this project."
            backTo={backTo}
        >
            <Stepper steps={SETUP_STEPS} current={wizard.step} />

            {wizard.reconfigureLoading ? <Spinner label="Loading project connection…" /> : null}

            {wizard.error ? (
                <Banner tone={messageBannerTone(wizard.error)}>
                    {wizard.error}
                    {wizard.planLimitUpgradeHref ? (
                        <>
                            {" "}
                            <a href={wizard.planLimitUpgradeHref} className="pf-banner-link">
                                Upgrade plan
                            </a>
                        </>
                    ) : null}
                </Banner>
            ) : null}

            {!wizard.reconfigureLoading && wizard.step === "framer" ? (
                <FramerStep
                    framerProjectUrl={wizard.framerProjectUrl}
                    framerApiKey={wizard.framerApiKey}
                    collections={wizard.collections}
                    selectedCollectionId={wizard.selectedFramerCollectionId}
                    selectedCollectionName={wizard.resolvedFramerCollection?.name}
                    collectionsLoaded={wizard.collectionsLoaded}
                    busy={wizard.busy}
                    lockFramerUrl
                    skipCollectionPicker
                    cancelHref={ROUTES.project(projectId)}
                    onUrlChange={wizard.setFramerProjectUrl}
                    onKeyChange={wizard.setFramerApiKey}
                    onLoadCollections={() => void wizard.loadCollections()}
                    onSelectCollection={wizard.setSelectedFramerCollectionId}
                    onContinue={wizard.continueFromFramer}
                />
            ) : null}

            {!wizard.reconfigureLoading && wizard.step === "source" ? (
                <SourceStep
                    path={wizard.path}
                    connectorId={wizard.connectorId}
                    setupSessionId={wizard.setupSessionId}
                    sources={wizard.sources}
                    selectedFramerCollection={wizard.resolvedFramerCollection}
                    importRowMax={importRowMaxForPlan(normalizePlanId(usage?.planId))}
                    importRowCount={wizard.importRowCount}
                    bootstrapWarnings={wizard.bootstrapWarnings}
                    busy={wizard.busy}
                    awaitingConnectorId={wizard.awaitingConnectorId}
                    reconfigureMode
                    currentSourceId={wizard.reconfigureContext?.notionDataSourceId ?? null}
                    onPathChange={wizard.setPath}
                    onConnect={wizard.connectConnector}
                    onConnectInTab={wizard.connectConnectorInTab}
                    onImportRowCountChange={wizard.setImportRowCount}
                    onSelectAllImportRows={wizard.selectAllImportRows}
                    onBootstrapSource={() => void wizard.bootstrapSource()}
                    onSelectExistingSource={wizard.selectExistingSource}
                    onBack={() => wizard.setStep("framer")}
                />
            ) : null}

            {!wizard.reconfigureLoading && wizard.step === "mapping" && !wizard.selectedSource ? (
                <Banner tone="info">
                    Mapping data was lost (refresh or hot reload).{" "}
                    <button
                        type="button"
                        className="pf-banner-link"
                        onClick={() => wizard.setStep("source")}
                    >
                        Go back to source step
                    </button>
                </Banner>
            ) : null}

            {!wizard.reconfigureLoading && wizard.step === "mapping" && wizard.selectedSource && wizard.connectorId ? (
                <MappingStep
                    source={wizard.selectedSource}
                    connectorId={wizard.connectorId}
                    mappings={wizard.mappings}
                    ignored={wizard.ignored}
                    slugOptions={wizard.slugOptions}
                    slugPropertyId={wizard.slugPropertyId}
                    autoSync={wizard.autoSync}
                    autoPublish={wizard.autoPublish}
                    publishMode={wizard.publishMode}
                    busy={wizard.busy}
                    canCreateProject
                    canSync={canSync}
                    hasAutoSync={hasAutoSync}
                    hasAutoPublish={hasAutoPublish}
                    framerSyncMode={wizard.framerSyncMode}
                    selectedFramerCollectionName={wizard.selectedFramerCollectionName}
                    canChooseSyncDestination={wizard.canChooseSyncDestination}
                    syncDestination={wizard.syncDestination}
                    newManagedCollectionName={wizard.newManagedCollectionName}
                    schemaWarnings={wizard.schemaWarnings}
                    reconfigureMode
                    onSyncDestinationChange={wizard.setSyncDestination}
                    onSlugChange={wizard.setSlugPropertyId}
                    onAutoSyncChange={wizard.setAutoSync}
                    onAutoPublishChange={wizard.setAutoPublish}
                    onPublishModeChange={wizard.setPublishMode}
                    onToggleIgnored={wizard.toggleIgnored}
                    onFieldNameChange={wizard.updateFieldName}
                    onBack={() => wizard.setStep("source")}
                    onSubmit={wizard.submitProject}
                />
            ) : null}

            {!wizard.reconfigureLoading && !wizard.reconfigureContext && wizard.error ? (
                <p className="pf-muted">
                    <Link className={buttonClass("secondary")} to={ROUTES.project(projectId)}>
                        Return to project
                    </Link>
                </p>
            ) : null}
        </AppShell>
    )
}
