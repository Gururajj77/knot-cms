import { BOOTSTRAP_IMPORT_ROW_MAX, SETUP_PATH_OPTIONS } from "@knotcms/shared"
import { useCallback, useEffect, useMemo } from "react"
import { useSearchParams } from "react-router-dom"
import { getConnector } from "./connectors/registry"
import { useConnectorOAuth } from "./connectors/useConnectorOAuth"
import type { ConnectorId } from "./connectors/types"
import { SETUP_SESSION_KEY } from "./constants"
import { framerCollectionFromSyncTarget, type UseSetupWizardOptions } from "./wizard/framer-display"
import { useFramerWizardActions } from "./wizard/useFramerWizardActions"
import { useMappingWizardActions } from "./wizard/useMappingWizardActions"
import { useNotionWizardActions } from "./wizard/useNotionWizardActions"
import { useWizardState } from "./wizard/useWizardState"

export type { UseSetupWizardOptions } from "./wizard/framer-display"

export function useSetupWizard(options: UseSetupWizardOptions = {}) {
    const [searchParams] = useSearchParams()
    const state = useWizardState(searchParams.get("setup_session_id"))
    const { setSetupSessionId, setStep } = state

    const selectedFramerCollection = useMemo(
        () => state.collections.find(collection => collection.id === state.selectedFramerCollectionId) ?? null,
        [state.collections, state.selectedFramerCollectionId]
    )

    const resolvedFramerCollection = useMemo(() => {
        if (selectedFramerCollection) return selectedFramerCollection
        if (!state.framerSyncTarget) return null
        return framerCollectionFromSyncTarget(state.framerSyncTarget)
    }, [selectedFramerCollection, state.framerSyncTarget])

    const mapping = useMappingWizardActions({
        ...state,
        resolvedFramerCollection,
        options,
    })

    const framer = useFramerWizardActions(state)

    const handleOAuthComplete = useCallback(
        (sessionId: string, _completedConnectorId: ConnectorId) => {
            setSetupSessionId(sessionId)
            setStep("notion")
        },
        [setSetupSessionId, setStep]
    )

    const oauth = useConnectorOAuth({ onComplete: handleOAuthComplete })

    const notion = useNotionWizardActions({
        ...state,
        oauthBusy: oauth.busy,
        selectedFramerCollection,
        resolvedFramerCollection,
        goToMapping: mapping.goToMapping,
    })

    useEffect(() => {
        const fromUrl = searchParams.get("setup_session_id")
        if (fromUrl) {
            sessionStorage.setItem(SETUP_SESSION_KEY, fromUrl)
            setSetupSessionId(fromUrl)
            setStep("notion")
        }
    }, [searchParams, setSetupSessionId, setStep])

    const selectAllImportRows = useCallback(() => {
        const total = resolvedFramerCollection?.itemCount ?? 0
        state.setImportRowCount(Math.min(total, BOOTSTRAP_IMPORT_ROW_MAX))
    }, [resolvedFramerCollection?.itemCount, state.setImportRowCount])

    return {
        step: state.step,
        path: state.path,
        error: state.wizardError ?? oauth.error,
        planLimitUpgradeHref: state.planLimitUpgradeHref,
        busy: state.busy || oauth.busy,
        awaitingConnectorId: oauth.awaitingConnectorId,
        setupSessionId: state.setupSessionId,
        sources: state.sources,
        selectedSource: state.selectedSource,
        mappings: state.mappings,
        ignored: state.ignored,
        slugOptions: mapping.slugOptions,
        framerProjectUrl: state.framerProjectUrl,
        framerApiKey: state.framerApiKey,
        collections: state.collections,
        collectionsLoaded: state.collectionsLoaded,
        selectedFramerCollectionId: state.selectedFramerCollectionId,
        selectedFramerCollection,
        resolvedFramerCollection,
        importRowCount: state.importRowCount,
        bootstrapWarnings: state.bootstrapWarnings,
        slugPropertyId: state.slugPropertyId,
        autoSync: state.autoSync,
        autoPublish: state.autoPublish,
        publishMode: state.publishMode,
        pathOptions: SETUP_PATH_OPTIONS,
        setFramerProjectUrl: framer.handleFramerUrlChange,
        setFramerApiKey: framer.handleFramerKeyChange,
        setSlugPropertyId: state.setSlugPropertyId,
        setAutoSync: state.setAutoSync,
        setAutoPublish: state.setAutoPublish,
        setPublishMode: state.setPublishMode,
        setStep: state.setStep,
        setPath: notion.handlePathChange,
        setImportRowCount: state.setImportRowCount,
        selectAllImportRows,
        loadCollections: framer.loadCollections,
        setSelectedFramerCollectionId: framer.selectFramerCollection,
        framerSyncTarget: mapping.effectiveFramerSyncTarget,
        continueFromFramer: framer.continueFromFramer,
        connectConnector: oauth.connectPopup,
        connectConnectorInTab: (id: ConnectorId) =>
            void oauth.connectInTab(id, getConnector(id).setupReturnPath),
        selectExistingSource: notion.selectExistingSource,
        bootstrapDatabase: notion.bootstrapDatabase,
        toggleIgnored: mapping.toggleIgnored,
        updateFieldName: mapping.updateFieldName,
        framerSyncMode: mapping.framerSyncMode,
        submitProject: mapping.submitProject,
        canChooseSyncDestination: mapping.canChooseSyncDestination,
        syncDestination: state.syncDestination,
        setSyncDestination: state.setSyncDestination,
        newManagedCollectionName: mapping.newManagedCollectionName,
        schemaWarnings: mapping.inPlaceSchemaCompatibility?.warnings,
    }
}
