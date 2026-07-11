import { useCallback, useEffect, useRef } from "react"
import {
    applyFramerCollectionFieldHints,
    buildFramerSyncTarget,
    propertiesToFieldMappings,
    syncDestinationForSetupPath,
    type FieldMapping,
    type ReconfigureProjectContext,
    type SetupPathId,
} from "@knotcms/shared"
import { apiErrorMessage, isRateLimitError } from "../../../lib/api-errors"
import {
    fetchDashboardDataSourceProperties,
    fetchDashboardDataSources,
    type DataSourceSummary,
    type FramerCollectionSummary,
} from "../../../lib/api"
import { getSetupWizardPlugin } from "../connectors/setup-registry"
import type { ConnectorId } from "../connectors/types"
import { clearSetupSessionState } from "../constants"
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
    connectorId: ConnectorId | null
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

    const plugin = connectorId ? getSetupWizardPlugin(connectorId) : null
    const lastSourcesLoadKeyRef = useRef<string | null>(null)

    useEffect(() => {
        if (!connectorId) return
        lastSourcesLoadKeyRef.current = null
        setSources([])
    }, [connectorId, path, setupSessionId, setSources])

    const loadSources = useCallback(
        async (sessionId: string) => {
            if (!plugin) return
            setBusy(true)
            setWizardError(null)
            try {
                setSources(await fetchDashboardDataSources(sessionId))
            } catch (err) {
                const message = apiErrorMessage(err, `Could not load ${plugin.providerLabel} sources`)
                if (isRateLimitError(err)) {
                    setWizardError(message)
                } else if (message.toLowerCase().includes("expired") || message.toLowerCase().includes("401")) {
                    clearSetupSessionState()
                    setSetupSessionId(null)
                    lastSourcesLoadKeyRef.current = null
                    setWizardError(message)
                } else {
                    lastSourcesLoadKeyRef.current = null
                    setWizardError(message)
                }
            } finally {
                setBusy(false)
            }
        },
        [plugin, setBusy, setSetupSessionId, setSources, setWizardError]
    )

    useEffect(() => {
        if (
            connectorId &&
            plugin &&
            (step === "source" || step === "review") &&
            setupSessionId &&
            plugin.shouldLoadSources(path) &&
            sources.length === 0 &&
            !busy &&
            !oauthBusy
        ) {
            const loadKey = `${setupSessionId}:${path ?? ""}:${connectorId}`
            if (lastSourcesLoadKeyRef.current === loadKey) return
            lastSourcesLoadKeyRef.current = loadKey
            void loadSources(setupSessionId)
        }
    }, [
        step,
        setupSessionId,
        path,
        connectorId,
        sources.length,
        busy,
        oauthBusy,
        loadSources,
        plugin,
    ])

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
            if (!setupSessionId || !plugin) return
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
                setWizardError(apiErrorMessage(err, "Could not load properties"))
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
        if (!plugin?.bootstrapSource) return

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
            setWizardError(apiErrorMessage(err, "Could not create source"))
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
