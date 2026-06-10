import {
    defaultFramerTypeForNotion,
    propertiesToFieldMappings,
    type FieldMapping,
    type PublishMode,
} from "@notion-framer/shared"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { ROUTES } from "../../constants/routes"
import {
    createDashboardProject,
    fetchDashboardDataSourceProperties,
    fetchDashboardDataSources,
    verifyDashboardFramerCredentials,
    type DataSourceSummary,
} from "../../lib/api"
import { ApiError } from "../../lib/api/client"
import { DEFAULT_CONNECTOR_ID, getConnector } from "./connectors/registry"
import { useConnectorOAuth } from "./connectors/useConnectorOAuth"
import type { ConnectorId } from "./connectors/types"
import { SETUP_SESSION_KEY, type SetupStepId } from "./constants"

export function useSetupWizard() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()

    const [step, setStep] = useState<SetupStepId>("connect")
    const [connectorId, setConnectorId] = useState<ConnectorId>(DEFAULT_CONNECTOR_ID)
    const [setupSessionId, setSetupSessionId] = useState<string | null>(searchParams.get("setup_session_id"))
    const [sources, setSources] = useState<DataSourceSummary[]>([])
    const [selectedSource, setSelectedSource] = useState<DataSourceSummary | null>(null)
    const [mappings, setMappings] = useState<FieldMapping[]>([])
    const [ignored, setIgnored] = useState<Set<string>>(new Set())

    const [framerProjectUrl, setFramerProjectUrl] = useState("")
    const [framerApiKey, setFramerApiKey] = useState("")
    const [slugPropertyId, setSlugPropertyId] = useState("")
    const [autoSync, setAutoSync] = useState(true)
    const [autoPublish, setAutoPublish] = useState(true)
    const [publishMode, setPublishMode] = useState<PublishMode>("deploy_live")

    const [wizardError, setWizardError] = useState<string | null>(null)
    const [framerVerified, setFramerVerified] = useState(false)
    const [testingFramer, setTestingFramer] = useState(false)
    const [busy, setBusy] = useState(false)

    const handleOAuthComplete = useCallback((sessionId: string, completedConnectorId: ConnectorId) => {
        setConnectorId(completedConnectorId)
        setSetupSessionId(sessionId)
        setStep("source")
    }, [])

    const oauth = useConnectorOAuth({ onComplete: handleOAuthComplete })

    const activeConnector = getConnector(connectorId)
    const error = wizardError ?? oauth.error

    useEffect(() => {
        const fromUrl = searchParams.get("setup_session_id")
        if (fromUrl) {
            sessionStorage.setItem(SETUP_SESSION_KEY, fromUrl)
            setSetupSessionId(fromUrl)
            setStep("source")
        }

    }, [searchParams])

    const slugOptions = useMemo(
        () =>
            mappings.filter(
                m => defaultFramerTypeForNotion(m.notionPropertyType) === "string" || m.notionPropertyType === "title"
            ),
        [mappings]
    )

    const loadSources = async (sessionId: string) => {
        setBusy(true)
        setWizardError(null)
        try {
            setSources(await fetchDashboardDataSources(sessionId))
            setStep("source")
        } catch (err) {
            const message =
                err instanceof Error ? err.message : `Could not load ${activeConnector.loadSourcesErrorLabel}`
            if (message.toLowerCase().includes("expired") || message.toLowerCase().includes("401")) {
                sessionStorage.removeItem(SETUP_SESSION_KEY)
                setSetupSessionId(null)
                setStep("connect")
            }
            setWizardError(message)
        } finally {
            setBusy(false)
        }
    }

    useEffect(() => {
        if (setupSessionId && step === "source" && sources.length === 0 && !busy && !oauth.busy) {
            void loadSources(setupSessionId)
        }
    }, [setupSessionId, step, sources.length, busy, oauth.busy])

    const selectSource = async (source: DataSourceSummary) => {
        if (!setupSessionId) return
        setBusy(true)
        setWizardError(null)
        try {
            const properties = await fetchDashboardDataSourceProperties(setupSessionId, source.id)
            const nextMappings = propertiesToFieldMappings(properties)
            setSelectedSource(source)
            setMappings(nextMappings)
            setIgnored(new Set())
            const firstSlug = nextMappings.find(
                m => defaultFramerTypeForNotion(m.notionPropertyType) === "string" || m.notionPropertyType === "title"
            )
            setSlugPropertyId(firstSlug?.notionPropertyId ?? "")
            setStep("mapping")
        } catch (err) {
            setWizardError(err instanceof Error ? err.message : "Could not load properties")
        } finally {
            setBusy(false)
        }
    }

    const toggleIgnored = (propertyId: string) => {
        setIgnored(prev => {
            const next = new Set(prev)
            if (next.has(propertyId)) next.delete(propertyId)
            else next.add(propertyId)
            return next
        })
    }

    const updateFieldName = (propertyId: string, name: string) => {
        setMappings(prev =>
            prev.map(m => (m.notionPropertyId === propertyId ? { ...m, framerFieldName: name } : m))
        )
    }

    const handleFramerUrlChange = (url: string) => {
        setFramerProjectUrl(url)
        setFramerVerified(false)
    }

    const handleFramerKeyChange = (key: string) => {
        setFramerApiKey(key)
        setFramerVerified(false)
    }

    const testFramerConnection = async () => {
        if (!framerProjectUrl.trim() || !framerApiKey.trim()) {
            setWizardError("Enter your Framer project URL and API key first.")
            return
        }

        setTestingFramer(true)
        setWizardError(null)
        try {
            await verifyDashboardFramerCredentials({
                framerProjectUrl: framerProjectUrl.trim(),
                framerApiKey: framerApiKey.trim(),
            })
            setFramerVerified(true)
        } catch (err) {
            setFramerVerified(false)
            setWizardError(
                err instanceof ApiError
                    ? err.message
                    : "Could not verify Framer credentials. Check the URL and API key."
            )
        } finally {
            setTestingFramer(false)
        }
    }

    const submitProject = async () => {
        if (!setupSessionId || !selectedSource) return
        if (!framerProjectUrl || !framerApiKey || !slugPropertyId) {
            setWizardError("Framer project URL, API key, and slug field are required.")
            return
        }

        setBusy(true)
        setWizardError(null)
        try {
            const { projectId } = await createDashboardProject({
                setupSessionId,
                framerProjectUrl,
                framerApiKey,
                notionDataSourceId: selectedSource.id,
                notionDatabaseId: selectedSource.databaseId,
                notionDataSourceTitle: selectedSource.title,
                slugNotionPropertyId: slugPropertyId,
                autoSync,
                autoPublish,
                publishMode,
                fieldMappings: mappings.map(m => ({
                    ...m,
                    ignored: ignored.has(m.notionPropertyId),
                })),
            })

            sessionStorage.removeItem(SETUP_SESSION_KEY)
            navigate(ROUTES.project(projectId))
        } catch (err) {
            setWizardError(err instanceof Error ? err.message : "Could not create project")
            setBusy(false)
        }
    }

    return {
        step,
        setStep,
        connectorId,
        activeConnector,
        error,
        busy: busy || oauth.busy,
        awaitingConnectorId: oauth.awaitingConnectorId,
        sources,
        selectedSource,
        mappings,
        ignored,
        slugOptions,
        framerProjectUrl,
        setFramerProjectUrl: handleFramerUrlChange,
        framerApiKey,
        setFramerApiKey: handleFramerKeyChange,
        framerVerified,
        testingFramer,
        testFramerConnection,
        slugPropertyId,
        setSlugPropertyId,
        autoSync,
        setAutoSync,
        autoPublish,
        setAutoPublish,
        publishMode,
        setPublishMode,
        connectConnector: oauth.connectPopup,
        connectConnectorInTab: (id: ConnectorId) =>
            void oauth.connectInTab(id, getConnector(id).setupReturnPath),
        selectSource,
        toggleIgnored,
        updateFieldName,
        submitProject,
    }
}
