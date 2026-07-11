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
import { NEW_PROJECT_SETUP_STEPS } from "./constants"
import { ReviewStep } from "./steps/ReviewStep"
import { SetupConnectStep } from "./steps/SetupConnectStep"
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
                subtitle="Connect your content source and Framer site, then review the mapping."
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
            subtitle="Connect your content source and Framer site, then review the mapping."
            backTo={{ label: "Projects", href: ROUTES.home }}
        >
            <Stepper steps={NEW_PROJECT_SETUP_STEPS} current={wizard.step} />

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

            {wizard.step === "connect" ? (
                <SetupConnectStep
                    connectorId={wizard.connectorId}
                    setupSessionId={wizard.setupSessionId}
                    framerProjectUrl={wizard.framerProjectUrl}
                    framerApiKey={wizard.framerApiKey}
                    collections={wizard.collections}
                    selectedCollectionId={wizard.selectedFramerCollectionId}
                    collectionsLoaded={wizard.collectionsLoaded}
                    framerCredentialsVerified={wizard.framerCredentialsVerified}
                    path={wizard.path}
                    showAdvanced={wizard.showAdvanced}
                    busy={wizard.busy}
                    awaitingConnectorId={wizard.awaitingConnectorId}
                    onConnect={wizard.connectConnector}
                    onConnectInTab={wizard.connectConnectorInTab}
                    onUrlChange={wizard.setFramerProjectUrl}
                    onKeyChange={wizard.setFramerApiKey}
                    onLoadCollections={() => void wizard.loadCollections()}
                    onSelectCollection={wizard.setSelectedFramerCollectionId}
                    onPathChange={wizard.setPath}
                    onShowAdvancedChange={wizard.setShowAdvanced}
                    onContinue={() => void wizard.continueToReview()}
                />
            ) : null}

            {wizard.step === "review" && wizard.connectorId ? (
                <ReviewStep
                    path={wizard.path}
                    connectorId={wizard.connectorId}
                    setupSessionId={wizard.setupSessionId}
                    sources={wizard.sources}
                    selectedSource={wizard.selectedSource}
                    selectedFramerCollection={wizard.resolvedFramerCollection}
                    mappings={wizard.mappings}
                    ignored={wizard.ignored}
                    slugOptions={wizard.slugOptions}
                    slugPropertyId={wizard.slugPropertyId}
                    autoSync={wizard.autoSync}
                    autoPublish={wizard.autoPublish}
                    publishMode={wizard.publishMode}
                    importRowMax={importRowMaxForPlan(normalizePlanId(usage?.planId))}
                    importRowCount={wizard.importRowCount}
                    bootstrapWarnings={wizard.bootstrapWarnings}
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
                    showAdvanced={wizard.showAdvanced}
                    collections={wizard.collections}
                    collectionsLoaded={wizard.collectionsLoaded}
                    selectedFramerCollectionId={wizard.selectedFramerCollectionId}
                    framerProjectUrl={wizard.framerProjectUrl}
                    framerApiKey={wizard.framerApiKey}
                    onLoadCollections={() => void wizard.loadCollections()}
                    onSelectCollection={wizard.setSelectedFramerCollectionId}
                    onPathChange={wizard.setPath}
                    onShowAdvancedChange={wizard.setShowAdvanced}
                    onImportRowCountChange={wizard.setImportRowCount}
                    onSelectAllImportRows={wizard.selectAllImportRows}
                    onBootstrapSource={() => void wizard.bootstrapSource()}
                    onSelectExistingSource={wizard.selectExistingSource}
                    onSyncDestinationChange={wizard.setSyncDestination}
                    onSlugChange={wizard.setSlugPropertyId}
                    onAutoSyncChange={wizard.setAutoSync}
                    onAutoPublishChange={wizard.setAutoPublish}
                    onPublishModeChange={wizard.setPublishMode}
                    onToggleIgnored={wizard.toggleIgnored}
                    onFieldNameChange={wizard.updateFieldName}
                    onBack={() => wizard.setStep("connect")}
                    onSubmit={wizard.submitProject}
                />
            ) : null}
        </AppShell>
    )
}
