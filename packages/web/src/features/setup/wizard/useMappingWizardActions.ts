import {
    analyzeInPlaceSchemaCompatibility,
    canChooseFramerSyncDestination,
    defaultFramerTypeForNotion,
    managedCollectionSyncName,
    resolveEffectiveSyncDestination,
    shouldPreserveUnlinkedFramerRows,
    type FieldMapping,
    type FramerSyncMode,
    type SetupPathId,
} from "@knotcms/shared"
import { useCallback, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { ROUTES } from "../../../constants/routes"
import { createDashboardProject, type DataSourceSummary } from "../../../lib/api"
import { ApiError } from "../../../lib/api/client"
import { isPlanLimitError, planLimitUpgradeHref } from "../../../lib/plan-errors"
import { clearSetupWizardDraft, SETUP_SESSION_KEY } from "../constants"
import { resolveEffectiveFramerSyncTarget } from "./sync-target"
import type { FramerCollectionSummary } from "../../../lib/api"
import type { UseSetupWizardOptions } from "./framer-display"
import type { WizardStateBag } from "./useWizardState"

type MappingWizardDeps = Pick<
    WizardStateBag,
    | "setupSessionId"
    | "selectedSource"
    | "framerProjectUrl"
    | "framerApiKey"
    | "slugPropertyId"
    | "autoSync"
    | "autoPublish"
    | "publishMode"
    | "mappings"
    | "ignored"
    | "syncDestination"
    | "path"
    | "importRowCount"
    | "setStep"
    | "setSelectedSource"
    | "setMappings"
    | "setIgnored"
    | "setSlugPropertyId"
    | "setWizardError"
    | "setPlanLimitUpgradeHref"
    | "setBusy"
    | "framerSyncTarget"
> & {
    resolvedFramerCollection: FramerCollectionSummary | null
    options: UseSetupWizardOptions
}

export function useMappingWizardActions(state: MappingWizardDeps) {
    const navigate = useNavigate()
    const {
        setupSessionId,
        selectedSource,
        framerProjectUrl,
        framerApiKey,
        slugPropertyId,
        autoSync,
        autoPublish,
        publishMode,
        mappings,
        ignored,
        syncDestination,
        path,
        importRowCount,
        setStep,
        setSelectedSource,
        setMappings,
        setIgnored,
        setSlugPropertyId,
        setWizardError,
        setPlanLimitUpgradeHref,
        setBusy,
        framerSyncTarget,
        resolvedFramerCollection,
        options,
    } = state

    const canChooseSyncDestination = canChooseFramerSyncDestination(
        path,
        resolvedFramerCollection
    )

    const effectiveSyncDestination = resolveEffectiveSyncDestination(
        path,
        syncDestination,
        resolvedFramerCollection
    )

    const goToMapping = useCallback(
        (source: DataSourceSummary, nextMappings: FieldMapping[]) => {
            setSelectedSource(source)
            setMappings(nextMappings)
            setIgnored(new Set())
            const firstSlug = nextMappings.find(
                m =>
                    defaultFramerTypeForNotion(m.notionPropertyType) === "string" ||
                    m.notionPropertyType === "title"
            )
            setSlugPropertyId(firstSlug?.notionPropertyId ?? "")
            setStep("mapping")
        },
        [setIgnored, setMappings, setSelectedSource, setSlugPropertyId, setStep]
    )

    const effectiveFramerSyncTarget = useMemo(
        () =>
            resolveEffectiveFramerSyncTarget(
                framerSyncTarget,
                resolvedFramerCollection,
                selectedSource?.title,
                effectiveSyncDestination
            ),
        [
            effectiveSyncDestination,
            framerSyncTarget,
            resolvedFramerCollection,
            selectedSource?.title,
        ]
    )

    const framerSyncMode: FramerSyncMode = effectiveFramerSyncTarget?.syncMode ?? "managed"

    const newManagedCollectionName = useMemo(() => {
        const baseName = selectedSource?.title ?? resolvedFramerCollection?.name
        if (!baseName) return null
        return managedCollectionSyncName(baseName)
    }, [resolvedFramerCollection?.name, selectedSource?.title])

    const preserveUnlinkedFramerRows = useMemo(
        () =>
            shouldPreserveUnlinkedFramerRows({
                setupPath: (path ?? "notion_to_framer") as SetupPathId,
                syncDestination,
                importRowCount,
                framerRowTotal: resolvedFramerCollection?.itemCount ?? 0,
            }),
        [importRowCount, path, resolvedFramerCollection?.itemCount, syncDestination]
    )

    const inPlaceSchemaCompatibility = useMemo(() => {
        if (!resolvedFramerCollection || effectiveSyncDestination !== "in_place") return null
        return analyzeInPlaceSchemaCompatibility(
            mappings,
            resolvedFramerCollection.fields,
            ignored,
            { preserveUnlinkedFramerRows }
        )
    }, [
        effectiveSyncDestination,
        ignored,
        mappings,
        preserveUnlinkedFramerRows,
        resolvedFramerCollection,
    ])

    const slugOptions = useMemo(
        () =>
            mappings.filter(
                m =>
                    defaultFramerTypeForNotion(m.notionPropertyType) === "string" ||
                    m.notionPropertyType === "title"
            ),
        [mappings]
    )

    const submitProject = useCallback(async () => {
        if (!setupSessionId || !selectedSource) return
        if (!framerProjectUrl || !framerApiKey || !slugPropertyId) {
            setWizardError("Slug field is required.")
            return
        }

        setBusy(true)
        setWizardError(null)
        try {
            const { projectId } = await createDashboardProject({
                setupSessionId,
                framerProjectUrl,
                framerApiKey,
                framerSyncMode,
                ...(effectiveFramerSyncTarget
                    ? {
                          framerCollectionId: effectiveFramerSyncTarget.syncCollectionId,
                          framerCollectionName: effectiveFramerSyncTarget.syncCollectionName,
                          framerTemplateCollectionId: effectiveFramerSyncTarget.templateCollectionId,
                      }
                    : {}),
                notionDataSourceId: selectedSource.id,
                notionDatabaseId: selectedSource.databaseId,
                notionDataSourceTitle: selectedSource.title,
                slugNotionPropertyId: slugPropertyId,
                autoSync: options.hasAutoSync === false ? false : autoSync,
                autoPublish: options.hasAutoPublish === false ? false : autoPublish,
                publishMode,
                fieldMappings: mappings.map(m => ({
                    ...m,
                    ignored: ignored.has(m.notionPropertyId),
                })),
                preserveUnlinkedFramerRows,
            })

            sessionStorage.removeItem(SETUP_SESSION_KEY)
            clearSetupWizardDraft()
            await options.onProjectCreated?.()
            navigate(ROUTES.project(projectId))
        } catch (err) {
            if (err instanceof ApiError && isPlanLimitError(err)) {
                setWizardError(err.message)
                setPlanLimitUpgradeHref(planLimitUpgradeHref(err))
            } else {
                setWizardError(err instanceof Error ? err.message : "Could not create project")
                setPlanLimitUpgradeHref(null)
            }
            setBusy(false)
        }
    }, [
        autoPublish,
        autoSync,
        effectiveFramerSyncTarget,
        framerApiKey,
        framerProjectUrl,
        framerSyncMode,
        ignored,
        mappings,
        navigate,
        preserveUnlinkedFramerRows,
        options,
        publishMode,
        selectedSource,
        setBusy,
        setPlanLimitUpgradeHref,
        setWizardError,
        setupSessionId,
        slugPropertyId,
    ])

    const toggleIgnored = useCallback(
        (propertyId: string) => {
            setIgnored(prev => {
                const next = new Set(prev)
                if (next.has(propertyId)) next.delete(propertyId)
                else next.add(propertyId)
                return next
            })
        },
        [setIgnored]
    )

    const updateFieldName = useCallback(
        (propertyId: string, name: string) => {
            setMappings(prev =>
                prev.map(m => (m.notionPropertyId === propertyId ? { ...m, framerFieldName: name } : m))
            )
        },
        [setMappings]
    )

    return {
        goToMapping,
        effectiveFramerSyncTarget,
        framerSyncMode,
        canChooseSyncDestination,
        newManagedCollectionName,
        inPlaceSchemaCompatibility,
        slugOptions,
        submitProject,
        toggleIgnored,
        updateFieldName,
    }
}
