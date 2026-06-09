import { useAuthContext } from "../../app/AuthContext"
import { ROUTES } from "../../constants/routes"
import { AppShell } from "../../components/layout"
import { Banner, Stepper } from "../../components/ui"
import { ConnectStep } from "./connectors/ConnectStep"
import { SETUP_STEPS } from "./constants"
import { MappingStep } from "./steps/MappingStep"
import { SelectDatabaseStep } from "./steps/SelectDatabaseStep"
import { useSetupWizard } from "./useSetupWizard"

export function SetupPage() {
    const { auth, refresh } = useAuthContext()
    const wizard = useSetupWizard()

    return (
        <AppShell
            title="New project"
            subtitle="Connect a data source, pick what to sync, and map fields to Framer CMS."
            backTo={{ label: "All projects", href: ROUTES.home }}
            email={auth?.email}
            onLogout={refresh}
        >
            <Stepper steps={SETUP_STEPS} current={wizard.step} />

            {wizard.error ? <Banner tone="error">{wizard.error}</Banner> : null}

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
                    autoSync={wizard.autoSync}
                    autoPublish={wizard.autoPublish}
                    publishMode={wizard.publishMode}
                    busy={wizard.busy}
                    onSlugChange={wizard.setSlugPropertyId}
                    onFramerUrlChange={wizard.setFramerProjectUrl}
                    onFramerKeyChange={wizard.setFramerApiKey}
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
