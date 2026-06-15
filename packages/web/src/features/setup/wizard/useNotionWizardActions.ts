import { useCallback, useEffect } from "react"
import {
    bootstrapDashboardNotionDatabase,
    fetchDashboardDataSourceProperties,
    fetchDashboardDataSources,
    type DataSourceSummary,
    type FramerCollectionSummary,
} from "../../../lib/api"
import {
    applyFramerCollectionFieldHints,
    buildFramerSyncTarget,
    propertiesToFieldMappings,
    syncDestinationForSetupPath,
    type FieldMapping,
    type ReconfigureProjectContext,
    type SetupPathId,
} from "@knotcms/shared"
import { SETUP_SESSION_KEY } from "../constants"
import type { WizardStateBag } from "./useWizardState"

type NotionWizardDeps = Pick<
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
}

export function useNotionWizardActions(state: NotionWizardDeps) {
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
    } = state

    const loadSources = useCallback(
        async (sessionId: string) => {
            setBusy(true)
            setWizardError(null)
            try {
                setSources(await fetchDashboardDataSources(sessionId))
            } catch (err) {
                const message = err instanceof Error ? err.message : "Could not load Notion databases"
                if (message.toLowerCase().includes("expired") || message.toLowerCase().includes("401")) {
                    sessionStorage.removeItem(SETUP_SESSION_KEY)
                    setSetupSessionId(null)
                }
                setWizardError(message)
            } finally {
                setBusy(false)
            }
        },
        [setBusy, setSetupSessionId, setSources, setWizardError]
    )

    useEffect(() => {
        if (
            step === "notion" &&
            setupSessionId &&
            path &&
            path !== "framer_to_notion" &&
            sources.length === 0 &&
            !busy &&
            !oauthBusy
        ) {
            void loadSources(setupSessionId)
        }
    }, [step, setupSessionId, path, sources.length, busy, oauthBusy, loadSources])

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
                    source.databaseId ? { sheetId: source.databaseId } : undefined
                )
                let nextMappings = propertiesToFieldMappings(properties)
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
            reconfigureContext,
            resolvedFramerCollection,
            selectedFramerCollection,
            setBusy,
            setFramerSyncTarget,
            setWizardError,
            setupSessionId,
        ]
    )

    const bootstrapDatabase = useCallback(async () => {
        const collectionId =
            framerSyncTarget?.templateCollectionId ??
            selectedFramerCollection?.id ??
            selectedFramerCollectionId
        if (!setupSessionId || !collectionId) return

        setBusy(true)
        setWizardError(null)
        try {
            const result = await bootstrapDashboardNotionDatabase({
                setupSessionId,
                framerProjectUrl: framerProjectUrl.trim(),
                framerApiKey: framerApiKey.trim(),
                framerCollectionId: collectionId,
                importRowCount,
                databaseTitle:
                    resolvedFramerCollection?.name ??
                    framerSyncTarget?.syncCollectionName ??
                    "Notion Sync",
            })
            const importNote =
                result.fromCache
                    ? "Using the Notion database from your earlier attempt in this session."
                    : result.itemsImported > 0
                      ? `Imported ${result.itemsImported} row${result.itemsImported === 1 ? "" : "s"} from Framer into Notion.`
                      : importRowCount > 0
                        ? "No Framer rows were imported into Notion."
                        : null
            setBootstrapWarnings(importNote ? [importNote, ...result.warnings] : result.warnings)
            const source: DataSourceSummary = {
                id: result.dataSourceId,
                title: result.title,
                databaseId: result.databaseId,
            }
            setFramerSyncTarget(result.framerSyncTarget)
            setSelectedFramerCollectionId(result.framerSyncTarget.templateCollectionId)
            goToMapping(
                source,
                result.fieldMappings.length > 0
                    ? result.fieldMappings
                    : propertiesToFieldMappings(result.properties)
            )
        } catch (err) {
            setWizardError(err instanceof Error ? err.message : "Could not create Notion database")
        } finally {
            setBusy(false)
        }
    }, [
        framerApiKey,
        framerProjectUrl,
        framerSyncTarget,
        goToMapping,
        importRowCount,
        resolvedFramerCollection,
        selectedFramerCollection,
        selectedFramerCollectionId,
        setBootstrapWarnings,
        setBusy,
        setFramerSyncTarget,
        setSelectedFramerCollectionId,
        setWizardError,
        setupSessionId,
    ])

    return {
        loadSources,
        handlePathChange,
        selectExistingSource,
        bootstrapDatabase,
    }
}
