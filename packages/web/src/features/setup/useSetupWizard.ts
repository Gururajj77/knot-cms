import type { ReconfigureProjectContext } from "@knotcms/shared"
import { BOOTSTRAP_IMPORT_ROW_MAX, buildFramerSyncTarget } from "@knotcms/shared"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { apiErrorMessage } from "../../lib/api-errors"
import { fetchReconfigureProjectContext } from "../../lib/api"
import { getConnector } from "./connectors/registry"
import { useConnectorOAuth } from "./connectors/useConnectorOAuth"
import type { ConnectorId } from "./connectors/types"
import { SETUP_SESSION_KEY, clearSetupWizardDraft, readSetupConnectorId, writeSetupConnectorId } from "./constants"
import { framerCollectionFromSyncTarget, type UseSetupWizardOptions } from "./wizard/framer-display"
import { useFramerWizardActions } from "./wizard/useFramerWizardActions"
import { useMappingWizardActions } from "./wizard/useMappingWizardActions"
import { useSourceWizardActions } from "./wizard/useSourceWizardActions"
import { useWizardState } from "./wizard/useWizardState"

export type { UseSetupWizardOptions } from "./wizard/framer-display"

function connectorIdFromSourceProvider(
    sourceProvider: ReconfigureProjectContext["sourceProvider"]
): ConnectorId {
    return sourceProvider === "google_sheets" ? "google_sheets" : "notion"
}

export function useSetupWizard(options: UseSetupWizardOptions = {}) {
    const isReconfigure = Boolean(options.reconfigureProjectId)
    const [searchParams] = useSearchParams()
    const state = useWizardState(searchParams.get("setup_session_id"), { skipDraft: isReconfigure })
    const {
        setSetupSessionId,
        setStep,
        setFramerSyncTarget,
        setPath,
        setSyncDestination,
        setWizardError,
        setFramerProjectUrl,
        setAutoSync,
        setAutoPublish,
        setPublishMode,
        setConnectorId,
    } = state
    const [reconfigureContext, setReconfigureContext] = useState<ReconfigureProjectContext | null>(
        null
    )
    const [reconfigureLoading, setReconfigureLoading] = useState(Boolean(options.reconfigureProjectId))

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
        reconfigureProjectId: options.reconfigureProjectId ?? null,
        reconfigureContext,
        connectorId: state.connectorId,
    })

    const framer = useFramerWizardActions({
        ...state,
        skipCollectionPicker: isReconfigure,
    })

    useEffect(() => {
        if (!isReconfigure) return
        clearSetupWizardDraft()
        setStep("framer")
    }, [isReconfigure, setStep])

    useEffect(() => {
        const projectId = options.reconfigureProjectId
        if (!projectId) return

        let cancelled = false
        void (async () => {
            setReconfigureLoading(true)
            setWizardError(null)
            try {
                const context = await fetchReconfigureProjectContext(projectId)
                if (cancelled) return

                setReconfigureContext(context)
                setConnectorId(connectorIdFromSourceProvider(context.sourceProvider))
                setFramerProjectUrl(context.framerProjectUrl)
                setAutoSync(context.autoSync)
                setAutoPublish(context.autoPublish)
                setPublishMode(context.publishMode)

                const createdNewCollection =
                    context.framerSyncMode === "managed" ||
                    Boolean(context.framerTemplateCollectionId)
                const setupPath = createdNewCollection ? "notion_to_framer" : "connect_existing"
                setPath(setupPath)
                setSyncDestination(setupPath === "notion_to_framer" ? "new_managed" : "in_place")

                const templateId = context.framerTemplateCollectionId ?? context.framerCollectionId
                const managedBy = context.framerSyncMode === "user" ? "user" : "thisPlugin"
                setFramerSyncTarget(
                    buildFramerSyncTarget(
                        {
                            id: templateId,
                            name: context.framerCollectionName ?? "Framer CMS",
                            managedBy,
                        },
                        context.notionDataSourceTitle,
                        setupPath === "notion_to_framer"
                            ? { destination: "new_managed" }
                            : { destination: "in_place" }
                    )
                )
            } catch (err) {
                if (!cancelled) {
                    setWizardError(apiErrorMessage(err, "Could not load project connection"))
                }
            } finally {
                if (!cancelled) setReconfigureLoading(false)
            }
        })()

        return () => {
            cancelled = true
        }
    }, [
        options.reconfigureProjectId,
        setConnectorId,
        setFramerSyncTarget,
        setPath,
        setSyncDestination,
        setWizardError,
        setFramerProjectUrl,
        setAutoSync,
        setAutoPublish,
        setPublishMode,
    ])

    const handleOAuthComplete = useCallback(
        (sessionId: string, completedConnectorId: ConnectorId) => {
            writeSetupConnectorId(completedConnectorId)
            setSetupSessionId(sessionId)
            setConnectorId(completedConnectorId)
            setPath(null)
            setStep("source")
        },
        [setConnectorId, setPath, setSetupSessionId, setStep]
    )

    const oauth = useConnectorOAuth({ onComplete: handleOAuthComplete })

    const source = useSourceWizardActions({
        ...state,
        oauthBusy: oauth.busy,
        selectedFramerCollection,
        resolvedFramerCollection,
        goToMapping: mapping.goToMapping,
        reconfigureContext,
        connectorId: state.connectorId,
    })

    useEffect(() => {
        const fromUrl = searchParams.get("setup_session_id")
        if (fromUrl) {
            sessionStorage.setItem(SETUP_SESSION_KEY, fromUrl)
            setSetupSessionId(fromUrl)
            const connectorFromUrl = searchParams.get("connector_id")
            const connectorId =
                connectorFromUrl === "google_sheets" || connectorFromUrl === "notion"
                    ? connectorFromUrl
                    : readSetupConnectorId()
            if (connectorId) {
                writeSetupConnectorId(connectorId)
                setConnectorId(connectorId)
            }
            setStep("source")
        }
    }, [searchParams, setConnectorId, setSetupSessionId, setStep])

    const importRowMax = options.importRowMax ?? BOOTSTRAP_IMPORT_ROW_MAX

    const selectAllImportRows = useCallback(() => {
        const total = resolvedFramerCollection?.itemCount ?? 0
        state.setImportRowCount(Math.min(total, importRowMax))
    }, [resolvedFramerCollection?.itemCount, importRowMax, state.setImportRowCount])

    return {
        reconfigureProjectId: options.reconfigureProjectId ?? null,
        reconfigureContext,
        reconfigureLoading,
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
        connectorId: state.connectorId,
        setupPlugin: source.plugin,
        setFramerProjectUrl: framer.handleFramerUrlChange,
        setFramerApiKey: framer.handleFramerKeyChange,
        setSlugPropertyId: state.setSlugPropertyId,
        setAutoSync: state.setAutoSync,
        setAutoPublish: state.setAutoPublish,
        setPublishMode: state.setPublishMode,
        setStep: state.setStep,
        setPath: source.handlePathChange,
        setImportRowCount: state.setImportRowCount,
        selectAllImportRows,
        loadCollections: framer.loadCollections,
        setSelectedFramerCollectionId: framer.selectFramerCollection,
        framerSyncTarget: mapping.effectiveFramerSyncTarget,
        continueFromFramer: framer.continueFromFramer,
        connectConnector: (id: ConnectorId) => {
            writeSetupConnectorId(id)
            setConnectorId(id)
            oauth.connectPopup(id)
        },
        connectConnectorInTab: (id: ConnectorId) => {
            writeSetupConnectorId(id)
            setConnectorId(id)
            void oauth.connectInTab(id, getConnector(id).setupReturnPath)
        },
        selectExistingSource: source.selectExistingSource,
        bootstrapSource: source.bootstrapSource,
        toggleIgnored: mapping.toggleIgnored,
        updateFieldName: mapping.updateFieldName,
        framerSyncMode: mapping.framerSyncMode,
        submitProject: mapping.submitProject,
        canChooseSyncDestination: mapping.canChooseSyncDestination,
        syncDestination: state.syncDestination,
        setSyncDestination: state.setSyncDestination,
        newManagedCollectionName: mapping.newManagedCollectionName,
        selectedFramerCollectionName: resolvedFramerCollection?.name ?? null,
        schemaWarnings: mapping.inPlaceSchemaCompatibility?.warnings,
    }
}
