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
import { ConnectStep } from "./connectors/ConnectStep"
import { SETUP_STEPS } from "./constants"
import { MappingStep } from "./steps/MappingStep"
import { SelectDatabaseStep } from "./steps/SelectDatabaseStep"
import { useSetupWizard } from "./useSetupWizard"

export function SetupPage() {
    const { refresh, canCreateProject, canSync, hasAutoSync, hasAutoPublish, usage } =
        useAuthContext()
    const wizard = useSetupWizard({
        onProjectCreated: refresh,
        hasAutoSync,
        hasAutoPublish,
    })

    if (!canCreateProject && usage) {
        const overLimit = isOverProjectLimit(usage)

        return (
            <AppShell
                title="New project"
                subtitle="Connect a source, pick your data, and map fields to Framer."
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
            subtitle="Connect a source, pick your data, and map fields to Framer."
            backTo={{ label: "Projects", href: ROUTES.home }}
        >
            <Stepper steps={SETUP_STEPS} current={wizard.step} />

            {wizard.error ? (
                <Banner tone="error">
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
                <ConnectStep
                    busy={wizard.busy}
                    awaitingConnectorId={wizard.awaitingConnectorId}
                    onConnect={wizard.connectConnector}
                    onConnectInTab={wizard.connectConnectorInTab}
                />
            ) : null}

            {wizard.step === "source" ? (
                <SelectDatabaseStep
                    busy={wizard.busy}
                    sources={wizard.sources}
                    sourcePickerDescription={wizard.activeConnector.definition.sourcePickerDescription}
                    onSelect={wizard.selectSource}
                />
            ) : null}

            {wizard.step === "mapping" && wizard.selectedSource ? (
                <MappingStep
                    source={wizard.selectedSource}
                    mappings={wizard.mappings}
                    ignored={wizard.ignored}
                    slugOptions={wizard.slugOptions}
                    slugPropertyId={wizard.slugPropertyId}
                    framerProjectUrl={wizard.framerProjectUrl}
                    framerApiKey={wizard.framerApiKey}
                    framerVerified={wizard.framerVerified}
                    testingFramer={wizard.testingFramer}
                    autoSync={wizard.autoSync}
                    autoPublish={wizard.autoPublish}
                    publishMode={wizard.publishMode}
                    busy={wizard.busy}
                    canCreateProject={canCreateProject}
                    canSync={canSync}
                    hasAutoSync={hasAutoSync}
                    hasAutoPublish={hasAutoPublish}
                    onSlugChange={wizard.setSlugPropertyId}
                    onFramerUrlChange={wizard.setFramerProjectUrl}
                    onFramerKeyChange={wizard.setFramerApiKey}
                    onTestFramer={wizard.testFramerConnection}
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
