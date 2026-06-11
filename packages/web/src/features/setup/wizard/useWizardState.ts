import type { FramerSyncDestination, SetupPathId, FramerSyncTarget, PublishMode, FieldMapping } from "@knotcms/shared"
import { useEffect, useState } from "react"
import type { DataSourceSummary, FramerCollectionSummary, NotionPageSummary } from "../../../lib/api"
import type { SetupStepId } from "../constants"
import { readSetupWizardDraft, writeSetupWizardDraft } from "../constants"

export function useWizardState(initialSessionId: string | null) {
    const draft = readSetupWizardDraft()

    const [step, setStep] = useState<SetupStepId>(draft?.step ?? "framer")
    const [path, setPath] = useState<SetupPathId | null>(draft?.path ?? null)
    const [setupSessionId, setSetupSessionId] = useState<string | null>(initialSessionId)
    const [sources, setSources] = useState<DataSourceSummary[]>([])
    const [selectedSource, setSelectedSource] = useState<DataSourceSummary | null>(null)
    const [mappings, setMappings] = useState<FieldMapping[]>([])
    const [ignored, setIgnored] = useState<Set<string>>(new Set())

    const [framerProjectUrl, setFramerProjectUrl] = useState(draft?.framerProjectUrl ?? "")
    const [framerApiKey, setFramerApiKey] = useState(draft?.framerApiKey ?? "")
    const [collections, setCollections] = useState<FramerCollectionSummary[]>([])
    const [collectionsLoaded, setCollectionsLoaded] = useState(false)
    const [selectedFramerCollectionId, setSelectedFramerCollectionId] = useState<string | null>(
        draft?.selectedFramerCollectionId ?? null
    )
    const [framerSyncTarget, setFramerSyncTarget] = useState<FramerSyncTarget | null>(
        draft?.framerSyncTarget ?? null
    )
    const [syncDestination, setSyncDestination] = useState<FramerSyncDestination>(
        draft?.syncDestination ?? "in_place"
    )

    const [parentPageQuery, setParentPageQuery] = useState("")
    const [selectedParentPageId, setSelectedParentPageId] = useState<string | null>(null)
    const [parentPages, setParentPages] = useState<NotionPageSummary[]>([])
    const [bootstrapWarnings, setBootstrapWarnings] = useState<string[]>([])

    const [slugPropertyId, setSlugPropertyId] = useState("")
    const [autoSync, setAutoSync] = useState(true)
    const [autoPublish, setAutoPublish] = useState(true)
    const [publishMode, setPublishMode] = useState<PublishMode>("deploy_live")

    const [wizardError, setWizardError] = useState<string | null>(null)
    const [planLimitUpgradeHref, setPlanLimitUpgradeHref] = useState<string | null>(null)
    const [busy, setBusy] = useState(false)

    useEffect(() => {
        writeSetupWizardDraft({
            step,
            path: path ?? undefined,
            framerProjectUrl,
            framerApiKey,
            selectedFramerCollectionId,
            framerSyncTarget,
            syncDestination,
        })
    }, [step, path, framerProjectUrl, framerApiKey, selectedFramerCollectionId, framerSyncTarget, syncDestination])

    return {
        step,
        setStep,
        path,
        setPath,
        setupSessionId,
        setSetupSessionId,
        sources,
        setSources,
        selectedSource,
        setSelectedSource,
        mappings,
        setMappings,
        ignored,
        setIgnored,
        framerProjectUrl,
        setFramerProjectUrl,
        framerApiKey,
        setFramerApiKey,
        collections,
        setCollections,
        collectionsLoaded,
        setCollectionsLoaded,
        selectedFramerCollectionId,
        setSelectedFramerCollectionId,
        framerSyncTarget,
        setFramerSyncTarget,
        syncDestination,
        setSyncDestination,
        parentPageQuery,
        setParentPageQuery,
        selectedParentPageId,
        setSelectedParentPageId,
        parentPages,
        setParentPages,
        bootstrapWarnings,
        setBootstrapWarnings,
        slugPropertyId,
        setSlugPropertyId,
        autoSync,
        setAutoSync,
        autoPublish,
        setAutoPublish,
        publishMode,
        setPublishMode,
        wizardError,
        setWizardError,
        planLimitUpgradeHref,
        setPlanLimitUpgradeHref,
        busy,
        setBusy,
    }
}

export type WizardStateBag = ReturnType<typeof useWizardState>
