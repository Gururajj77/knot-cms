import type { FramerSyncDestination, SetupPathId, FramerSyncTarget, PublishMode, FieldMapping } from "@knotcms/shared"
import { useEffect, useState } from "react"
import type { DataSourceSummary, FramerCollectionSummary } from "../../../lib/api"
import type { ConnectorId } from "../connectors/types"
import {
    clearSetupSessionState,
    DEFAULT_SETUP_PATH,
    initialSetupStep,
    readSetupConnectorId,
    readSetupWizardDraft,
    SETUP_CONNECTOR_KEY,
    SETUP_SESSION_KEY,
    writeSetupWizardDraft,
    type SetupStepId,
} from "../constants"

function initialConnectorId(): ConnectorId | null {
    return readSetupConnectorId()
}

export function useWizardState(
    initialSessionId: string | null,
    options: { skipDraft?: boolean; reconfigure?: boolean } = {}
) {
    const skipDraft = options.skipDraft ?? false
    const reconfigure = options.reconfigure ?? false
    const draft = skipDraft ? null : readSetupWizardDraft()

    const [connectorId, setConnectorId] = useState<ConnectorId | null>(() => initialConnectorId())
    const [step, setStep] = useState<SetupStepId>(() =>
        initialSetupStep(draft, { reconfigure })
    )
    const [path, setPath] = useState<SetupPathId | null>(
        draft?.path ?? (reconfigure ? null : DEFAULT_SETUP_PATH)
    )
    const [showAdvanced, setShowAdvanced] = useState(draft?.showAdvanced ?? false)
    const [setupSessionId, setSetupSessionId] = useState<string | null>(
        initialSessionId ?? sessionStorage.getItem(SETUP_SESSION_KEY)
    )
    const [sources, setSources] = useState<DataSourceSummary[]>([])
    const [selectedSource, setSelectedSource] = useState<DataSourceSummary | null>(
        draft?.selectedSource ?? null
    )
    const [mappings, setMappings] = useState<FieldMapping[]>(draft?.mappings ?? [])
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
        draft?.syncDestination ?? (reconfigure ? "in_place" : "new_managed")
    )

    const [importRowCount, setImportRowCount] = useState(0)
    const [bootstrapWarnings, setBootstrapWarnings] = useState<string[]>([])

    const [slugPropertyId, setSlugPropertyId] = useState(draft?.slugPropertyId ?? "")
    const [autoSync, setAutoSync] = useState(true)
    const [autoPublish, setAutoPublish] = useState(true)
    const [publishMode, setPublishMode] = useState<PublishMode>("deploy_live")

    const [wizardError, setWizardError] = useState<string | null>(null)
    const [planLimitUpgradeHref, setPlanLimitUpgradeHref] = useState<string | null>(null)
    const [busy, setBusy] = useState(false)

    useEffect(() => {
        if (skipDraft) return

        const sessionId = setupSessionId ?? sessionStorage.getItem(SETUP_SESSION_KEY)
        const connector = readSetupConnectorId()

        if (sessionId && !connector) {
            clearSetupSessionState()
            setSetupSessionId(null)
            return
        }

        if (!sessionId && connector) {
            sessionStorage.removeItem(SETUP_CONNECTOR_KEY)
            setConnectorId(null)
        }
    }, [setupSessionId, skipDraft])

    useEffect(() => {
        if (skipDraft) return

        if (reconfigure && step === "mapping" && !selectedSource) {
            setStep("source")
            return
        }

        writeSetupWizardDraft({
            step,
            path: path ?? undefined,
            framerProjectUrl,
            framerApiKey,
            selectedFramerCollectionId,
            framerSyncTarget,
            syncDestination,
            selectedSource,
            mappings,
            slugPropertyId,
            showAdvanced,
        })
    }, [
        step,
        path,
        framerProjectUrl,
        framerApiKey,
        selectedFramerCollectionId,
        framerSyncTarget,
        syncDestination,
        selectedSource,
        mappings,
        slugPropertyId,
        showAdvanced,
        reconfigure,
        skipDraft,
    ])

    return {
        connectorId,
        setConnectorId,
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
        importRowCount,
        setImportRowCount,
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
        showAdvanced,
        setShowAdvanced,
    }
}

export type WizardStateBag = ReturnType<typeof useWizardState>
