import { useCallback, useEffect } from "react"
import {
    bootstrapDashboardNotionDatabase,
    fetchDashboardDataSourceProperties,
    fetchDashboardDataSources,
    searchDashboardNotionPages,
    type DataSourceSummary,
    type FramerCollectionSummary,
    type NotionPageSummary,
} from "../../../lib/api"
import {
    applyFramerCollectionFieldHints,
    buildFramerSyncTarget,
    propertiesToFieldMappings,
    type FieldMapping,
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
    | "parentPageQuery"
    | "selectedParentPageId"
    | "setParentPages"
    | "setBootstrapWarnings"
    | "setFramerSyncTarget"
    | "setSelectedFramerCollectionId"
    | "framerProjectUrl"
    | "framerApiKey"
    | "framerSyncTarget"
    | "selectedFramerCollectionId"
    | "setWizardError"
    | "setBusy"
    | "setPath"
    | "setParentPageQuery"
    | "setSelectedParentPageId"
    | "setParentPages"
    | "busy"
> & {
    oauthBusy: boolean
    selectedFramerCollection: FramerCollectionSummary | null
    resolvedFramerCollection: FramerCollectionSummary | null
    goToMapping: (source: DataSourceSummary, nextMappings: FieldMapping[]) => void
}

export function useNotionWizardActions(state: NotionWizardDeps) {
    const {
        step,
        path,
        setupSessionId,
        setSetupSessionId,
        sources,
        setSources,
        parentPageQuery,
        selectedParentPageId,
        setParentPages,
        setBootstrapWarnings,
        setFramerSyncTarget,
        setSelectedFramerCollectionId,
        framerProjectUrl,
        framerApiKey,
        framerSyncTarget,
        selectedFramerCollectionId,
        setWizardError,
        setBusy,
        setPath,
        setParentPageQuery,
        setSelectedParentPageId,
        busy,
        oauthBusy,
        selectedFramerCollection,
        resolvedFramerCollection,
        goToMapping,
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
            setBootstrapWarnings([])
            setParentPages([])
            setSelectedParentPageId(null)
        },
        [setBootstrapWarnings, setParentPages, setPath, setSelectedParentPageId]
    )

    const selectExistingSource = useCallback(
        async (source: DataSourceSummary) => {
            if (!setupSessionId) return
            setBusy(true)
            setWizardError(null)
            try {
                const properties = await fetchDashboardDataSourceProperties(setupSessionId, source.id)
                let nextMappings = propertiesToFieldMappings(properties)
                const templateCollection = resolvedFramerCollection ?? selectedFramerCollection
                if (path === "connect_existing" && templateCollection) {
                    nextMappings = applyFramerCollectionFieldHints(nextMappings, templateCollection.fields)
                    setFramerSyncTarget(buildFramerSyncTarget(templateCollection, source.title))
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
            resolvedFramerCollection,
            selectedFramerCollection,
            setBusy,
            setFramerSyncTarget,
            setWizardError,
            setupSessionId,
        ]
    )

    const searchParentPages = useCallback(async () => {
        if (!setupSessionId) return
        setBusy(true)
        setWizardError(null)
        try {
            setParentPages(await searchDashboardNotionPages(setupSessionId, parentPageQuery))
        } catch (err) {
            setWizardError(err instanceof Error ? err.message : "Could not search Notion pages")
        } finally {
            setBusy(false)
        }
    }, [parentPageQuery, setBusy, setParentPages, setWizardError, setupSessionId])

    const bootstrapDatabase = useCallback(async () => {
        const collectionId =
            framerSyncTarget?.templateCollectionId ??
            selectedFramerCollection?.id ??
            selectedFramerCollectionId
        if (!setupSessionId || !collectionId) return
        const parentPageId = selectedParentPageId ?? parentPageQuery.trim()
        if (!parentPageId) {
            setWizardError("Select or paste a Notion parent page first.")
            return
        }

        setBusy(true)
        setWizardError(null)
        try {
            const result = await bootstrapDashboardNotionDatabase({
                setupSessionId,
                framerProjectUrl: framerProjectUrl.trim(),
                framerApiKey: framerApiKey.trim(),
                framerCollectionId: collectionId,
                parentPageId,
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
                      : result.itemsSkipped > 0
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
        parentPageQuery,
        resolvedFramerCollection,
        selectedFramerCollection,
        selectedFramerCollectionId,
        selectedParentPageId,
        setBootstrapWarnings,
        setBusy,
        setFramerSyncTarget,
        setSelectedFramerCollectionId,
        setWizardError,
        setupSessionId,
    ])

    const selectParentPage = useCallback(
        (pageId: string, pages: NotionPageSummary[]) => {
            setSelectedParentPageId(pageId)
            const page = pages.find(item => item.id === pageId)
            if (page) setParentPageQuery(page.title)
        },
        [setParentPageQuery, setSelectedParentPageId]
    )

    return {
        loadSources,
        handlePathChange,
        selectExistingSource,
        searchParentPages,
        bootstrapDatabase,
        selectParentPage,
    }
}
