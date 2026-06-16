import { importRowMaxForPlan, normalizePlanId } from "@knotcms/shared"
import { Link } from "react-router-dom"
import { useAuthContext } from "../../app/AuthContext"
import { ROUTES } from "../../constants/routes"
import { AppShell } from "../../components/layout"
import { Banner, EmptyState, Stepper, buttonClass } from "../../components/ui"
import {
    isOverProjectLimit,
    projectLimitReachedMessage,
    projectsOverLimitMessage,
} from "../../lib/plan-usage"
import { SETUP_STEPS } from "./constants"
import { FramerStep } from "./steps/FramerStep"
import { MappingStep } from "./steps/MappingStep"
import { SourceStep } from "./steps/SourceStep"
import { messageBannerTone } from "../../lib/api-errors"
import { useSetupWizard } from "./useSetupWizard"

export function SetupPage() {
    const { refresh, canCreateProject, canSync, hasAutoSync, hasAutoPublish, usage } =
        useAuthContext()
    const wizard = useSetupWizard({
        onProjectCreated: refresh,
        hasAutoSync,
        hasAutoPublish,
        importRowMax: importRowMaxForPlan(normalizePlanId(usage?.planId)),
    })

    if (!canCreateProject && usage) {
        const overLimit = isOverProjectLimit(usage)

        return (
            <AppShell
                title="New project"
                subtitle="Connect Framer, link your content source, and map fields for sync."
                backTo={{ label: "Projects", href: ROUTES.home }}
            >
                <EmptyState
                    title={overLimit ? "Delete projects to continue" : "Project limit reached"}
                    description={
                        overLimit
                            ? projectsOverLimitMessage(usage)
                            : projectLimitReachedMessage(usage.planId)
                    }
                    action={
                        <Link
                            className={buttonClass("primary")}
                            to={overLimit ? ROUTES.home : ROUTES.plans}
                        >
                            {overLimit ? "Back to projects" : "Open profile"}
                        </Link>
                    }
                />
            </AppShell>
        )
    }

    return (
        <AppShell
            title="New project"
            subtitle="Connect Framer, link your content source, and map fields for sync."
            backTo={{ label: "Projects", href: ROUTES.home }}
        >
            <Stepper steps={SETUP_STEPS} current={wizard.step} />

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

            {wizard.step === "framer" ? (
                <FramerStep
                    framerProjectUrl={wizard.framerProjectUrl}
                    framerApiKey={wizard.framerApiKey}
                    collections={wizard.collections}
                    selectedCollectionId={wizard.selectedFramerCollectionId}
                    selectedCollectionName={wizard.resolvedFramerCollection?.name}
                    collectionsLoaded={wizard.collectionsLoaded}
                    busy={wizard.busy}
                    onUrlChange={wizard.setFramerProjectUrl}
                    onKeyChange={wizard.setFramerApiKey}
                    onLoadCollections={() => void wizard.loadCollections()}
                    onSelectCollection={wizard.setSelectedFramerCollectionId}
                    onContinue={wizard.continueFromFramer}
                />
            ) : null}

            {wizard.step === "source" ? (
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

            {wizard.step === "mapping" && !wizard.selectedSource ? (
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

            {wizard.step === "mapping" && wizard.selectedSource ? (
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
                    canCreateProject={canCreateProject}
                    canSync={canSync}
                    hasAutoSync={hasAutoSync}
                    hasAutoPublish={hasAutoPublish}
                    framerSyncMode={wizard.framerSyncMode}
                    selectedFramerCollectionName={wizard.selectedFramerCollectionName}
                    canChooseSyncDestination={wizard.canChooseSyncDestination}
                    syncDestination={wizard.syncDestination}
                    newManagedCollectionName={wizard.newManagedCollectionName}
                    schemaWarnings={wizard.schemaWarnings}
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
        </AppShell>
    )
}
