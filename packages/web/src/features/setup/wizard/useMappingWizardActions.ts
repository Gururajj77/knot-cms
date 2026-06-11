import { defaultFramerTypeForNotion, type FieldMapping, type FramerSyncMode } from "@knotcms/shared"
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
        () => resolveEffectiveFramerSyncTarget(framerSyncTarget, resolvedFramerCollection, selectedSource?.title),
        [framerSyncTarget, resolvedFramerCollection, selectedSource?.title]
    )

    const framerSyncMode: FramerSyncMode = effectiveFramerSyncTarget?.syncMode ?? "managed"

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
        slugOptions,
        submitProject,
        toggleIgnored,
        updateFieldName,
    }
}
