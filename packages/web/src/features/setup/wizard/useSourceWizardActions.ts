import { useCallback, useEffect } from "react"
import {
    applyFramerCollectionFieldHints,
    buildFramerSyncTarget,
    propertiesToFieldMappings,
    syncDestinationForSetupPath,
    type FieldMapping,
    type ReconfigureProjectContext,
    type SetupPathId,
} from "@knotcms/shared"
import {
    fetchDashboardDataSourceProperties,
    fetchDashboardDataSources,
    type DataSourceSummary,
    type FramerCollectionSummary,
} from "../../../lib/api"
import { getSetupWizardPlugin } from "../connectors/setup-registry"
import type { ConnectorId } from "../connectors/types"
import { SETUP_SESSION_KEY } from "../constants"
import type { WizardStateBag } from "./useWizardState"

type SourceWizardDeps = Pick<
    WizardStateBag,
    | "step"
    | "path"
    | "setupSessionId"
    | "setSetupSessionId"
    | "sources"
    | "setSources"
    | "setBootstrapWarnings"
    | "setFramerSyncTarget"
    | "setSelectedFramerCollectionId"
    | "framerProjectUrl"
    | "framerApiKey"
    | "framerSyncTarget"
    | "selectedFramerCollectionId"
    | "importRowCount"
    | "setWizardError"
    | "setBusy"
    | "setPath"
    | "setSyncDestination"
    | "busy"
> & {
    oauthBusy: boolean
    selectedFramerCollection: FramerCollectionSummary | null
    resolvedFramerCollection: FramerCollectionSummary | null
    goToMapping: (source: DataSourceSummary, nextMappings: FieldMapping[]) => void
    reconfigureContext: ReconfigureProjectContext | null
    connectorId: ConnectorId
}

export function useSourceWizardActions(state: SourceWizardDeps) {
    const {
        step,
        path,
        setupSessionId,
        setSetupSessionId,
        sources,
        setSources,
        setBootstrapWarnings,
        setFramerSyncTarget,
        setSelectedFramerCollectionId,
        framerProjectUrl,
        framerApiKey,
        framerSyncTarget,
        selectedFramerCollectionId,
        importRowCount,
        setWizardError,
        setBusy,
        setPath,
        setSyncDestination,
        busy,
        oauthBusy,
        selectedFramerCollection,
        resolvedFramerCollection,
        goToMapping,
        reconfigureContext,
        connectorId,
    } = state

    const plugin = getSetupWizardPlugin(connectorId)

    const loadSources = useCallback(
        async (sessionId: string) => {
            setBusy(true)
            setWizardError(null)
            try {
                setSources(await fetchDashboardDataSources(sessionId))
            } catch (err) {
                const message =
                    err instanceof Error
                        ? err.message
                        : `Could not load ${plugin.providerLabel} sources`
                if (message.toLowerCase().includes("expired") || message.toLowerCase().includes("401")) {
                    sessionStorage.removeItem(SETUP_SESSION_KEY)
                    setSetupSessionId(null)
                }
                setWizardError(message)
            } finally {
                setBusy(false)
            }
        },
        [plugin.providerLabel, setBusy, setSetupSessionId, setSources, setWizardError]
    )

    useEffect(() => {
        if (
            step === "source" &&
            setupSessionId &&
            plugin.shouldLoadSources(path) &&
            sources.length === 0 &&
            !busy &&
            !oauthBusy
        ) {
            void loadSources(setupSessionId)
        }
    }, [step, setupSessionId, path, sources.length, busy, oauthBusy, loadSources, plugin])

    const handlePathChange = useCallback(
        (nextPath: Parameters<typeof setPath>[0]) => {
            setPath(nextPath)
            setSyncDestination(syncDestinationForSetupPath(nextPath as SetupPathId))
            setBootstrapWarnings([])
        },
        [setBootstrapWarnings, setPath, setSyncDestination]
    )

    const selectExistingSource = useCallback(
        async (source: DataSourceSummary) => {
            if (!setupSessionId) return
            setBusy(true)
            setWizardError(null)
            try {
                const properties = await fetchDashboardDataSourceProperties(
                    setupSessionId,
                    source.id,
                    plugin.propertiesOptions(source)
                )
                let nextMappings = propertiesToFieldMappings(properties, plugin.sourceProvider)
                if (
                    reconfigureContext &&
                    source.id === reconfigureContext.notionDataSourceId &&
                    reconfigureContext.fieldMappings.length > 0
                ) {
                    nextMappings = reconfigureContext.fieldMappings
                } else {
                    const templateCollection = resolvedFramerCollection ?? selectedFramerCollection
                    if (path === "connect_existing" && templateCollection) {
                        nextMappings = applyFramerCollectionFieldHints(
                            nextMappings,
                            templateCollection.fields
                        )
                        setFramerSyncTarget(buildFramerSyncTarget(templateCollection, source.title))
                    }
                }
                goToMapping(source, nextMappings)
            } catch (err) {
                setWizardError(err instanceof Error ? err.message : "Could not load properties")
            } finally {
                setBusy(false)
            }
        },
        [
            goToMapping,
            path,
            plugin,
            reconfigureContext,
            resolvedFramerCollection,
            selectedFramerCollection,
            setBusy,
            setFramerSyncTarget,
            setWizardError,
            setupSessionId,
        ]
    )

    const bootstrapSource = useCallback(async () => {
        if (!plugin.bootstrapSource) return

        const collectionId =
            framerSyncTarget?.templateCollectionId ??
            selectedFramerCollection?.id ??
            selectedFramerCollectionId
        if (!setupSessionId || !collectionId) return

        setBusy(true)
        setWizardError(null)
        try {
            await plugin.bootstrapSource({
                setupSessionId,
                framerProjectUrl,
                framerApiKey,
                framerCollectionId: collectionId,
                importRowCount,
                collectionName:
                    resolvedFramerCollection?.name ??
                    framerSyncTarget?.syncCollectionName ??
                    "Notion Sync",
                onWarnings: setBootstrapWarnings,
                onComplete: result => {
                    if (result.framerSyncTarget) {
                        setFramerSyncTarget(result.framerSyncTarget)
                    }
                    if (result.templateCollectionId) {
                        setSelectedFramerCollectionId(result.templateCollectionId)
                    }
                    goToMapping(result.source, result.mappings)
                },
                onError: message => setWizardError(message),
            })
        } catch (err) {
            setWizardError(err instanceof Error ? err.message : "Could not create source")
        } finally {
            setBusy(false)
        }
    }, [
        framerApiKey,
        framerProjectUrl,
        framerSyncTarget,
        goToMapping,
        importRowCount,
        plugin,
        resolvedFramerCollection,
        selectedFramerCollection,
        selectedFramerCollectionId,
        setBootstrapWarnings,
        setBusy,
        setWizardError,
        setupSessionId,
    ])

    return {
        loadSources,
        handlePathChange,
        selectExistingSource,
        bootstrapSource,
        plugin,
    }
}
