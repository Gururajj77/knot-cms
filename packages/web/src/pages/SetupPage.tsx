import {
    defaultFramerTypeForNotion,
    propertiesToFieldMappings,
    type FieldMapping,
    type PublishMode,
} from "@notion-framer/shared"
import { useEffect, useMemo, useRef, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import {
    createDashboardProject,
    createDashboardSetupSession,
    fetchDashboardDataSourceProperties,
    fetchDashboardDataSources,
} from "../api"
import { Shell } from "../components/Shell"
import { Spinner } from "../components/Spinner"
import { Stepper } from "../components/Stepper"

const SETUP_STEPS = [
    { id: "connect", label: "Notion" },
    { id: "source", label: "Database" },
    { id: "mapping", label: "Mapping" },
] as const

type Step = "connect" | "source" | "mapping"

const SETUP_SESSION_KEY = "pf_setup_session_id"

interface DataSource {
    id: string
    title: string
    databaseId?: string
}

export function SetupPage() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const [step, setStep] = useState<Step>("connect")
    const [setupSessionId, setSetupSessionId] = useState<string | null>(searchParams.get("setup_session_id"))
    const [sources, setSources] = useState<DataSource[]>([])
    const [selectedSource, setSelectedSource] = useState<DataSource | null>(null)
    const [mappings, setMappings] = useState<FieldMapping[]>([])
    const [ignored, setIgnored] = useState<Set<string>>(new Set())

    const [framerProjectUrl, setFramerProjectUrl] = useState("")
    const [framerApiKey, setFramerApiKey] = useState("")
    const [slugPropertyId, setSlugPropertyId] = useState("")
    const [autoSync, setAutoSync] = useState(true)
    const [autoPublish, setAutoPublish] = useState(true)
    const [publishMode, setPublishMode] = useState<PublishMode>("deploy_live")

    const [error, setError] = useState<string | null>(null)
    const [busy, setBusy] = useState(false)
    const [awaitingPopup, setAwaitingPopup] = useState(false)
    const pendingOAuthRef = useRef<{ setupSessionId: string; oauthUrl: string } | null>(null)
    const popupRef = useRef<Window | null>(null)
    const popupPollRef = useRef<ReturnType<typeof setInterval> | null>(null)

    useEffect(() => {
        const handler = (event: MessageEvent) => {
            if (event.data?.type !== "notion-oauth-complete" || !event.data.setupSessionId) return
            const sessionId = event.data.setupSessionId as string
            sessionStorage.setItem(SETUP_SESSION_KEY, sessionId)
            pendingOAuthRef.current = null
            setSetupSessionId(sessionId)
            setAwaitingPopup(false)
            setStep("source")
            setBusy(false)
        }
        window.addEventListener("message", handler)
        return () => {
            window.removeEventListener("message", handler)
            if (popupPollRef.current) clearInterval(popupPollRef.current)
        }
    }, [])

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

    const watchPopup = (popup: Window) => {
        popupRef.current = popup
        if (popupPollRef.current) clearInterval(popupPollRef.current)
        popupPollRef.current = setInterval(() => {
            if (popup.closed) {
                if (popupPollRef.current) clearInterval(popupPollRef.current)
                popupPollRef.current = null
                popupRef.current = null
                setAwaitingPopup(false)
                setBusy(false)
            }
        }, 500)
    }

    const connectNotion = () => {
        setError(null)

        // Must open synchronously on click — await before window.open breaks Chrome's user-gesture rule.
        const popup = window.open("about:blank", "notion-oauth", "popup,width=560,height=760")
        if (!popup) {
            setError("Popup blocked. Allow popups for this site, or use “Continue in this tab” below.")
            return
        }

        setBusy(true)
        setAwaitingPopup(true)
        watchPopup(popup)

        void (async () => {
            try {
                if (!pendingOAuthRef.current) {
                    const session = await createDashboardSetupSession()
                    if (session.credentialWarning) {
                        popup.close()
                        setAwaitingPopup(false)
                        setError(session.credentialWarning)
                        return
                    }
                    pendingOAuthRef.current = {
                        setupSessionId: session.setupSessionId,
                        oauthUrl: session.oauthUrl,
                    }
                }

                if (popup.closed) return
                popup.location.replace(pendingOAuthRef.current.oauthUrl)
            } catch (err) {
                popup.close()
                setAwaitingPopup(false)
                setError(err instanceof Error ? err.message : "Could not start Notion OAuth")
            } finally {
                setBusy(false)
            }
        })()
    }

    const connectNotionInTab = async () => {
        setBusy(true)
        setError(null)
        try {
            const session = pendingOAuthRef.current
                ? { setupSessionId: pendingOAuthRef.current.setupSessionId, oauthUrl: pendingOAuthRef.current.oauthUrl }
                : await createDashboardSetupSession()
            if ("credentialWarning" in session && session.credentialWarning) {
                setError(session.credentialWarning)
                setBusy(false)
                return
            }
            if (!pendingOAuthRef.current) {
                pendingOAuthRef.current = {
                    setupSessionId: session.setupSessionId,
                    oauthUrl: session.oauthUrl,
                }
            }
            const params = new URLSearchParams({
                setup_session_id: pendingOAuthRef.current.setupSessionId,
                return_to: "/setup",
            })
            window.location.href = `/oauth/notion/start?${params.toString()}`
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not start Notion OAuth")
            setBusy(false)
        }
    }

    const loadSources = async (sessionId: string) => {
        setBusy(true)
        setError(null)
        try {
            setSources(await fetchDashboardDataSources(sessionId))
            setStep("source")
        } catch (err) {
            const message = err instanceof Error ? err.message : "Could not load Notion databases"
            if (message.toLowerCase().includes("expired") || message.toLowerCase().includes("401")) {
                sessionStorage.removeItem(SETUP_SESSION_KEY)
                setSetupSessionId(null)
                setStep("connect")
            }
            setError(message)
        } finally {
            setBusy(false)
        }
    }

    useEffect(() => {
        if (setupSessionId && step === "source" && sources.length === 0 && !busy) {
            void loadSources(setupSessionId)
        }
    }, [setupSessionId, step, sources.length, busy])

    const selectSource = async (source: DataSource) => {
        if (!setupSessionId) return
        setBusy(true)
        setError(null)
        try {
            const properties = await fetchDashboardDataSourceProperties(setupSessionId, source.id)
            const nextMappings = propertiesToFieldMappings(properties)
            setSelectedSource({ ...source, databaseId: source.databaseId })
            setMappings(nextMappings)
            setIgnored(new Set())
            const firstSlug = nextMappings.find(
                m => defaultFramerTypeForNotion(m.notionPropertyType) === "string" || m.notionPropertyType === "title"
            )
            setSlugPropertyId(firstSlug?.notionPropertyId ?? "")
            setStep("mapping")
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not load properties")
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

    const submitProject = async () => {
        if (!setupSessionId || !selectedSource) return
        if (!framerProjectUrl || !framerApiKey || !slugPropertyId) {
            setError("Framer project URL, API key, and slug field are required.")
            return
        }

        setBusy(true)
        setError(null)
        try {
            const fieldMappings = mappings.map(m => ({
                ...m,
                ignored: ignored.has(m.notionPropertyId),
            }))

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
                fieldMappings,
            })

            sessionStorage.removeItem(SETUP_SESSION_KEY)
            navigate(`/projects/${projectId}`)
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not create project")
            setBusy(false)
        }
    }

    return (
        <Shell
            title="New project"
            subtitle="Connect Notion, pick a database, and map fields to Framer CMS."
            backTo={{ label: "All projects", href: "/" }}
        >
            <Stepper steps={[...SETUP_STEPS]} current={step} />

            {error ? <div className="pf-banner pf-banner--err">{error}</div> : null}

            {step === "connect" ? (
                <div className="pf-card">
                    <p className="pf-section-label">Step 1</p>
                    <h2 className="pf-card-title">Connect Notion</h2>
                    <p className="pf-subtitle" style={{ marginBottom: "1.25rem" }}>
                        Authorize the workspace that holds your content. Notion opens in a new window —
                        complete authorization there, then return to this tab.
                    </p>
                    {awaitingPopup ? (
                        <div className="pf-banner pf-banner--info">
                            Waiting for Notion authorization in the popup…
                        </div>
                    ) : null}
                    <div className="pf-actions">
                        <button type="button" onClick={connectNotion} disabled={busy}>
                            {awaitingPopup ? "Reopen Notion window" : "Connect Notion"}
                        </button>
                        <button
                            type="button"
                            className="secondary"
                            onClick={() => void connectNotionInTab()}
                            disabled={busy}
                        >
                            Continue in this tab
                        </button>
                        <Link className="pf-button secondary" to="/">
                            Cancel
                        </Link>
                    </div>
                </div>
            ) : null}

            {step === "source" ? (
                <div className="pf-card">
                    <p className="pf-section-label">Step 2</p>
                    <h2 className="pf-card-title">Choose a database</h2>
                    <p className="pf-subtitle" style={{ marginBottom: "1.25rem" }}>
                        Select the Notion database to sync to Framer.
                    </p>
                    {busy ? (
                        <Spinner label="Loading databases…" />
                    ) : (
                        <ul className="pf-list">
                            {sources.map(source => (
                                <li key={source.id}>
                                    <button
                                        type="button"
                                        className="pf-list-item pf-list-item--selectable"
                                        style={{ width: "100%", textAlign: "left" }}
                                        onClick={() => void selectSource(source)}
                                    >
                                        <span className="pf-list-item-title">{source.title}</span>
                                        <span className="pf-meta">Select →</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            ) : null}

            {step === "mapping" && selectedSource ? (
                <div className="pf-card">
                    <p className="pf-section-label">Step 3</p>
                    <h2 className="pf-card-title">Map fields</h2>
                    <p className="pf-subtitle" style={{ marginBottom: "1.25rem" }}>
                        Map Notion properties to Framer CMS for <strong>{selectedSource.title}</strong>.
                    </p>

                    {mappings.map(mapping => (
                        <div key={mapping.notionPropertyId} className="pf-mapping">
                            <label className="pf-mapping-source">
                                <input
                                    type="checkbox"
                                    checked={!ignored.has(mapping.notionPropertyId)}
                                    onChange={() => toggleIgnored(mapping.notionPropertyId)}
                                />
                                {mapping.notionPropertyName}
                            </label>
                            <span className="pf-mapping-arrow" aria-hidden>
                                →
                            </span>
                            <input
                                className="pf-input"
                                disabled={ignored.has(mapping.notionPropertyId)}
                                value={mapping.framerFieldName}
                                onChange={e => updateFieldName(mapping.notionPropertyId, e.target.value)}
                            />
                        </div>
                    ))}

                    <hr className="pf-divider" />

                    <p className="pf-section-label">Framer connection</p>

                    <div className="pf-field">
                        <label htmlFor="slug">Slug field</label>
                        <select
                            id="slug"
                            className="pf-select"
                            value={slugPropertyId}
                            onChange={e => setSlugPropertyId(e.target.value)}
                        >
                            {slugOptions.map(m => (
                                <option key={m.notionPropertyId} value={m.notionPropertyId}>
                                    {m.notionPropertyName}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="pf-field">
                        <label htmlFor="framer-url">Framer project URL</label>
                        <input
                            id="framer-url"
                            className="pf-input"
                            placeholder="https://framer.com/projects/..."
                            value={framerProjectUrl}
                            onChange={e => setFramerProjectUrl(e.target.value)}
                        />
                    </div>

                    <div className="pf-field">
                        <label htmlFor="framer-key">Framer Server API key</label>
                        <input
                            id="framer-key"
                            className="pf-input"
                            type="password"
                            value={framerApiKey}
                            onChange={e => setFramerApiKey(e.target.value)}
                        />
                    </div>

                    <hr className="pf-divider" />

                    <p className="pf-section-label">Automation</p>

                    <label className="pf-check-row">
                        <input type="checkbox" checked={autoSync} onChange={e => setAutoSync(e.target.checked)} />
                        Auto-sync on Notion changes
                    </label>
                    <label className="pf-check-row">
                        <input type="checkbox" checked={autoPublish} onChange={e => setAutoPublish(e.target.checked)} />
                        Auto-publish after sync
                    </label>

                    {autoPublish ? (
                        <div className="pf-field" style={{ marginTop: "1rem" }}>
                            <label htmlFor="publish-mode">Publish mode</label>
                            <select
                                id="publish-mode"
                                className="pf-select"
                                value={publishMode}
                                onChange={e => setPublishMode(e.target.value as PublishMode)}
                            >
                                <option value="deploy_live">Deploy to live site</option>
                                <option value="preview_only">Preview only</option>
                            </select>
                        </div>
                    ) : null}

                    <div className="pf-actions">
                        <button type="button" onClick={() => void submitProject()} disabled={busy}>
                            {busy ? "Creating…" : "Create & sync"}
                        </button>
                        <button type="button" className="secondary" onClick={() => setStep("source")}>
                            Back
                        </button>
                    </div>
                </div>
            ) : null}
        </Shell>
    )
}
