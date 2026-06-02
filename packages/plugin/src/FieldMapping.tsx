import { type FieldMapping, type PublishMode, defaultFramerTypeForNotion } from "@notion-framer/shared"
import { framer, type ManagedCollection, type ManagedCollectionFieldInput } from "framer-plugin"
import { useCallback, useEffect, useMemo, useState } from "react"
import { ApiRequestError } from "./formatApiError"
import { createProject, verifyLicense } from "./api"
import {
    formatSyncResult,
    mappingsToManagedFields,
    type NotionDataSourceConfig,
    PLUGIN_KEYS,
    propertiesToFieldMappings,
    saveCollectionPluginData,
    syncCollectionFromWorker,
} from "./data"
import { StepHeader, WizardShell } from "./WizardShell"

interface FieldMappingRowProps {
    field: ManagedCollectionFieldInput
    originalFieldName: string | undefined
    isIgnored: boolean
    onToggleDisabled: (fieldId: string) => void
    onNameChange: (fieldId: string, name: string) => void
}

function FieldMappingRow({
    field,
    originalFieldName,
    isIgnored,
    onToggleDisabled,
    onNameChange,
}: FieldMappingRowProps) {
    return (
        <>
            <button
                type="button"
                className={`nf-mapping-source ${isIgnored ? "ignored" : ""}`}
                onClick={() => onToggleDisabled(field.id)}
            >
                <input type="checkbox" checked={!isIgnored} tabIndex={-1} readOnly />
                <span>{originalFieldName ?? field.id}</span>
            </button>
            <svg className="nf-mapping-arrow" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path
                    d="M3 8h10M10 5l3 3-3 3"
                    stroke="currentColor"
                    strokeWidth="1.25"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
            <input
                type="text"
                className="nf-input nf-input--mono nf-mapping-target"
                disabled={isIgnored}
                placeholder={field.id}
                value={field.name}
                onChange={event => onNameChange(field.id, event.target.value)}
            />
        </>
    )
}

interface FieldMappingProps {
    collection: ManagedCollection
    dataSource: NotionDataSourceConfig
    setupSessionId: string
    initialSlugFieldId: string | null
    existingProjectId: string | null
}

export function FieldMapping({ collection, dataSource, setupSessionId, initialSlugFieldId }: FieldMappingProps) {
    const [status, setStatus] = useState<"mapping-fields" | "syncing-collection">("mapping-fields")
    const [fields, setFields] = useState<ManagedCollectionFieldInput[]>(() =>
        mappingsToManagedFields(propertiesToFieldMappings(dataSource.properties))
    )
    const [ignoredFieldIds, setIgnoredFieldIds] = useState<ReadonlySet<string>>(new Set())
    const [mappings, setMappings] = useState<FieldMapping[]>(() => propertiesToFieldMappings(dataSource.properties))

    const [framerProjectUrl, setFramerProjectUrl] = useState("")
    const [framerApiKey, setFramerApiKey] = useState("")
    const [licenseKey, setLicenseKey] = useState("")
    const [autoSync, setAutoSync] = useState(true)
    const [autoPublish, setAutoPublish] = useState(true)
    const [publishMode, setPublishMode] = useState<PublishMode>("deploy_live")

    const possibleSlugFields = useMemo(
        () => dataSource.properties.filter(p => defaultFramerTypeForNotion(p.type) === "string" || p.type === "title"),
        [dataSource.properties]
    )

    const [selectedSlugPropertyId, setSelectedSlugPropertyId] = useState(
        initialSlugFieldId ?? possibleSlugFields[0]?.id ?? ""
    )

    const isSyncing = status === "syncing-collection"

    useEffect(() => {
        const initialMappings = propertiesToFieldMappings(dataSource.properties)
        setMappings(initialMappings)
        setFields(mappingsToManagedFields(initialMappings))
    }, [dataSource.properties])

    const changeFieldName = useCallback((fieldId: string, name: string) => {
        setFields(prev => prev.map(f => (f.id === fieldId ? { ...f, name } : f)))
        setMappings(prev => prev.map(m => (m.framerFieldId === fieldId ? { ...m, framerFieldName: name } : m)))
    }, [])

    const toggleFieldDisabledState = useCallback((fieldId: string) => {
        setIgnoredFieldIds(prev => {
            const next = new Set(prev)
            if (next.has(fieldId)) next.delete(fieldId)
            else next.add(fieldId)
            setMappings(mappingsPrev =>
                mappingsPrev.map(m => (m.framerFieldId === fieldId ? { ...m, ignored: next.has(fieldId) } : m))
            )
            return next
        })
    }, [])

    const savePluginData = async (projectId: string) => {
        await saveCollectionPluginData(collection, {
            [PLUGIN_KEYS.PROJECT_ID]: projectId,
            [PLUGIN_KEYS.DATA_SOURCE_ID]: dataSource.id,
            [PLUGIN_KEYS.SLUG_FIELD_ID]: selectedSlugPropertyId,
            [PLUGIN_KEYS.COLLECTION_NAME]: dataSource.title,
        })
    }

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        if (!selectedSlugPropertyId) {
            framer.notify("Select a slug field.", { variant: "warning" })
            return
        }
        if (!framerProjectUrl.trim() || !framerApiKey.trim() || !licenseKey.trim()) {
            framer.notify("Project URL, API key, and license are required.", { variant: "warning" })
            return
        }

        try {
            setStatus("syncing-collection")

            const license = await verifyLicense(licenseKey.trim(), framerProjectUrl.trim())
            if (!license.valid) {
                framer.notify(license.reason ?? "Invalid license", { variant: "error" })
                return
            }

            const activeMappings = mappings.map(m => ({
                ...m,
                ignored: ignoredFieldIds.has(m.framerFieldId),
                framerFieldName: fields.find(f => f.id === m.framerFieldId)?.name.trim() || m.framerFieldName,
            }))

            const created = await createProject({
                setupSessionId,
                framerProjectUrl: framerProjectUrl.trim(),
                notionDataSourceId: dataSource.id,
                notionDatabaseId: dataSource.databaseId,
                notionDataSourceTitle: dataSource.title,
                slugNotionPropertyId: selectedSlugPropertyId,
                licenseKey: licenseKey.trim(),
                framerApiKey: framerApiKey.trim(),
                autoSync,
                autoPublish,
                publishMode,
                fieldMappings: activeMappings,
            })
            const projectId = created.projectId

            await savePluginData(projectId)

            if (created.syncError) {
                framer.notify(created.syncError.error, { variant: "error", durationMs: 12000 })
                return
            }

            if (created.sync && created.sync.itemsSynced > 0) {
                framer.closePlugin(
                    formatSyncResult(created.sync, dataSource.title) +
                        " Open the “" +
                        dataSource.title +
                        "” CMS collection in Framer.",
                    { variant: "success" }
                )
                return
            }

            const result = await syncCollectionFromWorker(projectId)
            framer.closePlugin(
                formatSyncResult(result, dataSource.title) +
                    " Open the “" +
                    dataSource.title +
                    "” CMS collection in Framer.",
                { variant: "success" }
            )
        } catch (error) {
            console.error(error)
            const msg =
                error instanceof ApiRequestError
                    ? error.message
                    : error instanceof Error
                      ? error.message
                      : "Setup failed"
            framer.notify(msg, { variant: "error", durationMs: 10000 })
        } finally {
            setStatus("mapping-fields")
        }
    }

    return (
        <WizardShell setupStep={3}>
            <form className="nf-mapping-page framer-hide-scrollbar" onSubmit={handleSubmit}>
                <div className="nf-mapping-scroll">
                    <StepHeader
                        title="Map fields"
                        description={`Match each Notion property to a Framer CMS field. Sync writes to “${dataSource.title}” via the Server API.`}
                    />

                    <div className="nf-form-stack">
                        <div className="nf-field">
                            <label htmlFor="framerUrl">Project URL</label>
                            <input
                                id="framerUrl"
                                type="url"
                                className="nf-input nf-input--mono"
                                placeholder="https://framer.com/projects/..."
                                value={framerProjectUrl}
                                onChange={e => setFramerProjectUrl(e.target.value)}
                                required
                            />
                        </div>
                        <div className="nf-field">
                            <label htmlFor="framerKey">Server API key</label>
                            <input
                                id="framerKey"
                                type="password"
                                className="nf-input nf-input--mono"
                                placeholder="frm_..."
                                value={framerApiKey}
                                onChange={e => setFramerApiKey(e.target.value)}
                                required
                            />
                            <p className="nf-field-hint">Framer → CMS → Settings → API Keys</p>
                        </div>
                        <div className="nf-field">
                            <label htmlFor="licenseKey">License key</label>
                            <input
                                id="licenseKey"
                                type="text"
                                className="nf-input"
                                value={licenseKey}
                                onChange={e => setLicenseKey(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="nf-callout">
                        <p className="nf-callout-title">Publishing</p>
                        <p className="nf-callout-text">Control when synced content goes live on your site.</p>
                        <label className="nf-check-row">
                            <input type="checkbox" checked={autoSync} onChange={e => setAutoSync(e.target.checked)} />
                            Auto-sync on Notion changes
                        </label>
                        <label className="nf-check-row">
                            <input
                                type="checkbox"
                                checked={autoPublish}
                                onChange={e => setAutoPublish(e.target.checked)}
                            />
                            Auto-publish after sync
                        </label>
                        {autoPublish && (
                            <div className="nf-field">
                                <label htmlFor="publishMode">Publish mode</label>
                                <select
                                    id="publishMode"
                                    className="nf-select"
                                    value={publishMode}
                                    onChange={e => setPublishMode(e.target.value as PublishMode)}
                                >
                                    <option value="preview_only">Preview only</option>
                                    <option value="deploy_live">Deploy to live site</option>
                                </select>
                            </div>
                        )}
                    </div>

                    <div className="nf-field">
                        <label htmlFor="slugField">Slug field</label>
                        <select
                            id="slugField"
                            className="nf-select"
                            required
                            value={selectedSlugPropertyId}
                            onChange={e => setSelectedSlugPropertyId(e.target.value)}
                        >
                            {possibleSlugFields.map(f => (
                                <option key={f.id} value={f.id}>
                                    {f.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <div className="nf-mapping-grid-head">
                            <span className="nf-label-caps">Notion</span>
                            <span />
                            <span className="nf-label-caps">Framer CMS</span>
                        </div>
                        <div className="nf-mapping-grid">
                            {fields.map(field => (
                                <FieldMappingRow
                                    key={field.id}
                                    field={field}
                                    originalFieldName={dataSource.properties.find(p => p.id === field.id)?.name}
                                    isIgnored={ignoredFieldIds.has(field.id)}
                                    onToggleDisabled={toggleFieldDisabledState}
                                    onNameChange={changeFieldName}
                                />
                            ))}
                        </div>
                    </div>

                    <p className="nf-info-inline">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                            <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.25" />
                            <path
                                d="M6 5.5V8.5M6 4h.01"
                                stroke="currentColor"
                                strokeWidth="1.25"
                                strokeLinecap="round"
                            />
                        </svg>
                        Uncheck a Notion field to skip it. Edit Framer names before continuing.
                    </p>
                </div>

                <div className="nf-mapping-footer">
                    <button type="submit" className="nf-btn nf-btn--primary" disabled={isSyncing}>
                        {isSyncing ? <div className="framer-spinner" /> : `Connect ${dataSource.title}`}
                    </button>
                </div>
            </form>
        </WizardShell>
    )
}
